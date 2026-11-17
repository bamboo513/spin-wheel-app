'use client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface DialogOutputProps {
    isResultDialogOpen: boolean;
    setIsResultDialogOpen: (open: boolean) => void;
    winner: string;
    activeCollection: { name: string } | null;
    winnerItem: { color: string } | null;
    spinWheel: () => void;
}
export const PASTEL_RAINBOW_COLORS = [
    "#FFB3BA", "#FFD6A5", "#FFDFBA", "#FFFFBA",
    "#CAFFBF", "#BAFFC9", "#9BF6FF", "#BAE1FF",
    "#A0C4FF", "#BDB2FF", "#C7CEEA", "#FFC6FF",
];

export default function WinnerDialog({ isResultDialogOpen, setIsResultDialogOpen, winner, activeCollection, winnerItem, spinWheel }: DialogOutputProps) {
    return (
        <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
            <DialogContent className="sm:max-w-md text-center">
                <DialogHeader className="items-center text-center">
                    <div className="mx-auto size-14 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center mb-1">
                        <Sparkles className="size-7 text-pink-500 animate-bounce" />
                    </div>
                    <DialogTitle className="text-xl sm:text-2xl font-bold">
                        ผลการสุ่มวงล้อ!
                    </DialogTitle>
                    <DialogDescription>
                        วงล้อสีรุ้งพาสเทลได้เลือกตัวเลือกนี้ให้คุณแล้ว
                    </DialogDescription>
                </DialogHeader>

                <div className="my-4 p-6 rounded-2xl bg-muted/40 border border-border flex flex-col items-center justify-center gap-3">
                    <span
                        className="size-5 rounded-full border border-black/10 shadow-xs"
                        style={{
                            backgroundColor: winnerItem?.color || PASTEL_RAINBOW_COLORS[0],
                        }}
                    />
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight break-words px-2">
                        {winner}
                    </h2>
                    <Badge variant="outline" className="text-xs text-muted-foreground mt-1">
                        {activeCollection?.name}
                    </Badge>
                </div>

                <DialogFooter className="sm:justify-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsResultDialogOpen(false)}
                        className="cursor-pointer"
                    >
                        ปิดหน้าต่าง
                    </Button>
                    <Button
                        onClick={() => {
                            setIsResultDialogOpen(false);
                            setTimeout(() => spinWheel(), 200);
                        }}
                        className="cursor-pointer"
                    >
                        หมุนอีกครั้ง
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}