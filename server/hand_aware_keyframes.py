"""Hand-aware keyframe sampler for (N, D) landmark sequences.

Layout assumption: each frame vector is [pose (33*3) | hand_1 (21*3) | hand_2 (21*3)],
i.e. D = 225. A frame "has hands" if either hand block is non-zero.

Strategy to pick exactly `target` frames from N:
  - If the number of hand frames >= target: farthest-point-sample (FPS) among
    the hand frames only, discarding non-hand frames entirely.
  - If the number of hand frames < target: keep every hand frame, then pad up
    to `target` by FPS over the non-hand frames (seeded by the hand frames so
    the padding frames are maximally diverse from what's already selected).
  - If there are no hand frames at all: fall back to plain FPS over all frames.

Output frames are always returned in original temporal order.
"""

from typing import Optional

import numpy as np
import tensorflow as tf

NUM_POSE_LANDMARKS = 33
NUM_HAND_LANDMARKS = 21
TARGET_FRAMES = 16


def farthest_point_sample(frames: np.ndarray, n: int, seed_frames: Optional[np.ndarray] = None) -> list[int]:
    """FPS over `frames`, optionally seeded so initial min-dists are from `seed_frames`."""
    if len(frames) <= n:
        return list(range(len(frames)))
    if seed_frames is not None and len(seed_frames) > 0:
        min_dists = np.min(
            np.sum((frames[:, None, :] - seed_frames[None, :, :]) ** 2, axis=2), axis=1
        )
    else:
        min_dists = np.full(len(frames), np.inf)
    selected = []
    for _ in range(n):
        chosen = int(np.argmax(min_dists))
        selected.append(chosen)
        d = np.sum((frames - frames[chosen]) ** 2, axis=1)
        min_dists = np.minimum(min_dists, d)
    return sorted(selected)


def has_hands(frame: np.ndarray, num_pose: int = NUM_POSE_LANDMARKS, num_hand: int = NUM_HAND_LANDMARKS) -> bool:
    hand_block = frame[num_pose * 3:]
    return np.any(hand_block.reshape(2, num_hand * 3), axis=1).any()


def sample_with_hands(data: np.ndarray, target: int = TARGET_FRAMES) -> np.ndarray:
    """Always include all hand frames.

    - If hand-frames >= target: FPS among hand frames to get `target`.
    - If hand-frames < target: keep all hand frames, FPS from non-hand frames
      (seeded by hand frames) to fill up to `target`.
    """
    hand_mask = np.array([has_hands(f) for f in data])
    hand_idx = np.where(hand_mask)[0]
    nohand_idx = np.where(~hand_mask)[0]

    if len(hand_idx) == 0:
        # no hands at all -- fall back to plain FPS
        return data[farthest_point_sample(data, min(target, len(data)))]

    if len(hand_idx) >= target:
        chosen = farthest_point_sample(data[hand_idx], target)
        return data[hand_idx[chosen]]

    # fewer hand-frames than target: pad with FPS from non-hand frames
    n_pad = target - len(hand_idx)
    if len(nohand_idx) > 0:
        pad_chosen = farthest_point_sample(
            data[nohand_idx], min(n_pad, len(nohand_idx)), seed_frames=data[hand_idx]
        )
        selected = np.sort(np.concatenate([hand_idx, nohand_idx[pad_chosen]]))
    else:
        selected = hand_idx

    return data[selected]


def load_and_sample_keyframes(path: tf.Tensor, label: tf.Tensor, target: int = TARGET_FRAMES):
    """`dataset.map` fn: load an (N, 225) landmark .npy from `path` and hand-aware-sample it to `target` frames.

    `path` is a scalar tf.string tensor; `label` is passed through unchanged.
    Returns `(frames, label)` where `frames` has static shape (target, D). Clips
    with fewer than `target` available frames are zero-padded at the end (pair
    with a Keras `Masking(mask_value=0.0)` layer so the LSTM ignores the padding).

    Usage:
        dataset = dataset.map(load_and_sample_keyframes, num_parallel_calls=tf.data.AUTOTUNE)
    """
    D = (NUM_POSE_LANDMARKS + NUM_HAND_LANDMARKS * 2) * 3

    def _load(p):
        data = np.load(p.decode("utf-8"))
        sampled = sample_with_hands(data, target=target).astype(np.float32)
        if len(sampled) < target:
            pad = np.zeros((target - len(sampled), D), dtype=np.float32)
            sampled = np.concatenate([sampled, pad])
        return sampled

    frames = tf.numpy_function(_load, [path], tf.float32)
    frames.set_shape((target, D))
    return frames, label


if __name__ == "__main__":
    D = (NUM_POSE_LANDMARKS + NUM_HAND_LANDMARKS * 2) * 3  # 225
    rng = np.random.default_rng(0)

    def make_frame(with_hands: bool) -> np.ndarray:
        frame = rng.standard_normal(D)
        if not with_hands:
            frame[NUM_POSE_LANDMARKS * 3:] = 0.0
        return frame

    # Case 1: hand-frames >= target (30 hand frames, 10 non-hand)
    frames = np.stack([make_frame(i % 3 != 0) for i in range(40)])
    hand_count = sum(has_hands(f) for f in frames)
    out = sample_with_hands(frames, target=16)
    assert out.shape == (16, D)
    assert hand_count >= 16
    print(f"[case 1] hand_frames={hand_count} N=40 -> {out.shape[0]} frames (FPS among hands only)")

    # Case 2: hand-frames < target (5 hand frames, 35 non-hand) -> pad from non-hand
    frames = np.stack([make_frame(i < 5) for i in range(40)])
    hand_count = sum(has_hands(f) for f in frames)
    out = sample_with_hands(frames, target=16)
    out_hand_count = sum(has_hands(f) for f in out)
    assert out.shape == (16, D)
    assert out_hand_count == 5, f"expected all 5 hand frames kept, got {out_hand_count}"
    print(f"[case 2] hand_frames={hand_count} N=40 -> {out.shape[0]} frames ({out_hand_count} with hands, padded from non-hand)")

    # Case 3: no hand frames at all -> plain FPS fallback
    frames = np.stack([make_frame(False) for _ in range(40)])
    out = sample_with_hands(frames, target=16)
    assert out.shape == (16, D)
    print(f"[case 3] hand_frames=0 N=40 -> {out.shape[0]} frames (plain FPS fallback)")

    # Case 4: N < target overall -> return everything available
    frames = np.stack([make_frame(True) for _ in range(10)])
    out = sample_with_hands(frames, target=16)
    assert out.shape == (10, D)
    print(f"[case 4] N=10 < target=16 -> {out.shape[0]} frames (all hand frames returned)")

    print("\nAll checks passed.")
