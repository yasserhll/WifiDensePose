export type Activity =
  | "standing"
  | "sitting"
  | "sleeping"
  | "walking"
  | "exercising"
  | "absent";

export interface Keypoint {
  name: string;
  x: number;
  y: number;
  z: number;
  confidence: number;
}

export interface PoseFrame {
  keypoints: Keypoint[];
  activity: Activity;
  confidence: number;
  presence: boolean;
  timestamp: number;
  csi_summary: {
    mean_amplitude: number;
    std_amplitude: number;
    subcarrier_profile: number[];
  };
}

export interface RoomState {
  lighting: number;
  temperature: number;
  blinds: number;
  music: boolean;
  white_noise: boolean;
  alert_fall: boolean;
}

export const SKELETON_CONNECTIONS: [number, number][] = [
  [15, 13], [13, 11], [16, 14], [14, 12], [11, 12],
  [5, 11], [6, 12], [5, 6],
  [5, 7], [6, 8], [7, 9], [8, 10],
  [1, 2], [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6],
];

export const ACTIVITY_LABELS: Record<Activity, string> = {
  standing: "Debout",
  sitting: "Assis",
  sleeping: "Endormi",
  walking: "Marche",
  exercising: "Exercice",
  absent: "Absent",
};

export const ACTIVITY_COLORS: Record<Activity, string> = {
  standing: "#00d4ff",
  sitting: "#7c5cff",
  sleeping: "#39d353",
  walking: "#f0a500",
  exercising: "#f85149",
  absent: "#4a4f5a",
};
