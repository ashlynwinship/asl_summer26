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

def select_keyframes(
        pose: list[list[float]],
        hands: list[list[DetectedHand]] | None,
        min_frame_gap: int = 1,
        velocity_threshold: float = 0.005, # hand must move across 2cm in a frame to be considered a peak
        hold_velocity_threshold: float = 0.002, # hand must move less than 0.5cm in a frame to be considered a hold
) -> list[int]:
    """ Selects keyframes based on velocity peaks (motion) and holds (near-zero velocity after a peak).
    Returns a list of frame indices that CLS0/CLS1 can slice from the pose and hands data """
    if not pose:
        return []
    
    velocities = compute_velocities(pose, hands)
    num_frames = len(pose)
    selected_frames = []
    last_selected = -min_frame_gap # ensure first frame can be selected

    selected_frames.append(0) # always include first frame
    last_selected = 0

    for i in range(1, num_frames-1):
        is_significant_peak = velocities[i] >= 0.05 # always include significant peaks even if they are close together

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
    if num_frames - 1 not in selected_frames:
        selected_frames.append(num_frames - 1)
    
    return sorted(selected_frames)