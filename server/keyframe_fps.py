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
    # special case: exactly 3 frames requested
    if target == 3:
        hand_mask = np.array([has_hands(f) for f in data])
        hand_idx = np.where(hand_mask)[0]

        if len(hand_idx) == 0:
            # no hand frames: fall back first, middle, last of all frames
            idx = [0, len(data) // 2, len(data) - 1]
        elif len(hand_idx) == 1:
            # only one hand frame: repeat it three times
            idx = [hand_idx[0]] * 3
        elif len(hand_idx) == 2:
            # two hand frames: repeat the first, then the last
            idx = [hand_idx[0], hand_idx[0], hand_idx[-1]]
        else:
            # three or more hand frames: first, middle, last
            mid = hand_idx[len(hand_idx) // 2]
            idx = [hand_idx[0], mid, hand_idx[-1]]
        
        return data[sorted(set(idx))]

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