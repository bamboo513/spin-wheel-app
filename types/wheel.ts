export interface WheelItem {
    id: string;
    text: string;
    color?: string;
}

export interface WheelCollection {
    id: string;
    name: string;
    items: WheelItem[];
}