import numpy as np

from server.main import DetectedHand

def compute_velocities(
        pose: list[list[float]],
        hands: list[list[DetectedHand]] | None,
) -> list[float]:
    """ Computes velocities for each frame as the mean landmark displacement from the previous frame, weighted toward hand landmarks.
     Returns a list of velocities, one per frame, with the first frame velocity set to 0. """
    num_frames = len(pose)
    velocities = [0.0]

    # upper body landmarks
    RELEVANT_POSE_INDICES = list(range(0, 25))

    for i in range(1, num_frames):
        prev_frame = np.array(pose[i - 1]).reshape(33, 3)
        curr_frame = np.array(pose[i]).reshape(33, 3)

        # mean displacement over relevant pose landmarks
        pose_displacement = np.mean(np.linalg.norm(curr_frame[RELEVANT_POSE_INDICES] - prev_frame[RELEVANT_POSE_INDICES], axis=1))
        
        # mean hand displacement
        hands_displacement = 0.0
        if hands and hands[i] and hands[i-1]:
            displacements = []
            for curr_hand in hands[i]:
                # find matching hand from previous frame
                matching = next((h for h in hands[i-1] if h.label == curr_hand.label), None)
                if matching:
                    curr_landmarks = np.array(curr_hand.landmarks).reshape(21, 3)
                    prev_landmarks = np.array(matching.landmarks).reshape(21, 3)
                    displacements.append(np.mean(np.linalg.norm(curr_landmarks - prev_landmarks, axis=1)))
                if displacements:
                    hands_displacement = np.mean(displacements)
        
        # combined displacement, weighted toward hands if present
        combined = (pose_displacement + 2.0 * hands_displacement) / (3.0 if hands_displacement > 0 else 1.0)
        velocities.append(combined)

    return velocities

def find_signing_region(
        velocities: list[float],
        onset_threshold: float = 0.01,
        min_active_frames: int = 5,
) -> tuple[int, int]:
    """ Finds the start and end frame indices of the signing region based on velocity thresholds.
    Returns a tuple (start_frame, end_frame) inclusive. If no signing region is found, returns (0, len(velocities)-1). """
    num_frames = len(velocities)

    # find first frame where velocity exceeds threshold and stays elevated for at least min_active_frames
    start_frame = 0
    for i in range(num_frames - min_active_frames):
        window = velocities[i:i + min_active_frames]
        if sum(v >= onset_threshold for v in window) >= min_active_frames // 2:  # at least half the frames in the window exceed threshold
            start_frame = max(0, i - 2) # keep 2 frames before onset for context
            break

    # find last frame where velocity exceeds threshold
    end_frame = num_frames - 1
    for i in range(num_frames - 1, min_active_frames, -1):
        window = velocities[i - min_active_frames:i]
        if sum(v >= onset_threshold for v in window) >= min_active_frames // 2:
            end_frame = min(num_frames - 1, i + 2) # keep 2 frames after offset for context
            break
    
    return start_frame, end_frame

def select_keyframes(
        pose: list[list[float]],
        hands: list[list[DetectedHand]] | None,
        min_frame_gap: int = 1,
        velocity_threshold: float = 0.005, 
        hold_velocity_threshold: float = 0.002,
        significant_peak_threshold: float = 0.05
) -> list[int]:
    """ Selects keyframes based on velocity peaks (motion) and holds (near-zero velocity after a peak).
    Returns a list of frame indices that CLS0/CLS1 can slice from the pose and hands data """
    if not pose:
        return []
    
    velocities = compute_velocities(pose, hands)
    num_frames = len(pose)

    start_frame, end_frame = find_signing_region(velocities)

    selected_frames = []
    last_selected = -min_frame_gap # ensure first frame can be selected

    selected_frames.append(start_frame) # always include first frame
    last_selected = start_frame

    for i in range(start_frame + 1, end_frame):
        is_significant_peak = velocities[i] >= significant_peak_threshold # always include significant peaks even if they are close together

        if is_significant_peak:
            selected_frames.append(i)
            last_selected = i
            continue

        if i - last_selected < min_frame_gap:
            continue

        is_peak = velocities[i] >= velocity_threshold and velocities[i] > velocities[i-1] and velocities[i] > velocities[i+1] # local maximum captures moment a hand changes
        is_hold = velocities[i] <= hold_velocity_threshold and velocities[last_selected] > velocity_threshold # came from motion (decelerating)
        
        if is_peak or is_hold:
            selected_frames.append(i)
            last_selected = i
   
    # always include the last frame
    if end_frame not in selected_frames:
        selected_frames.append(end_frame)
    
    return sorted(selected_frames)