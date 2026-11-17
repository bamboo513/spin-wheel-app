"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { WheelCollection, WheelItem } from "@/types/wheel";
import {
    Plus,
    Trash2,
    RotateCw,
    Bookmark,
    FolderPlus,
    Sparkles,
    Shuffle,
    Palette,
    ArrowLeft,
    Layers,
    ChevronRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// พาเลทสีรุ้งโทนพาสเทล สดใสละมุนตา
export const PASTEL_RAINBOW_COLORS = [
    "#FFB3BA", "#FFD6A5", "#FFDFBA", "#FFFFBA",
    "#CAFFBF", "#BAFFC9", "#9BF6FF", "#BAE1FF",
    "#A0C4FF", "#BDB2FF", "#C7CEEA", "#FFC6FF",
];

const DEFAULT_COLLECTIONS: WheelCollection[] = [
    {
        id: "1",
        name: "มื้อนี้กินอะไรดี?",
        items: [
            { id: "i1", text: "ส้มตำปูปลาร้า", color: "#FFB3BA" },
            { id: "i2", text: "ข้าวมันไก่", color: "#FFDFBA" },
            { id: "i3", text: "ก๋วยเตี๋ยวเรือ", color: "#FFFFBA" },
            { id: "i4", text: "สเต็กหมู", color: "#BAFFC9" },
            { id: "i5", text: "ชาบู/หมูกระทะ", color: "#BAE1FF" },
        ],
    },
    {
        id: "2",
        name: "กิจกรรมวันหยุด",
        items: [
            { id: "j1", text: "อ่านหนังสือสไตล์มินิมอล", color: "#FFB3BA" },
            { id: "j2", text: "เขียนโค้ดโปรเจกต์เล่น", color: "#FFDFBA" },
            { id: "j3", text: "ไปคาเฟ่ถ่ายรูป", color: "#BAE1FF" },
            { id: "j4", text: "นอนดูซีรีส์ยาวๆ", color: "#FFC6FF" },
        ],
    },
];

// Theme External Store ป้องกัน Hydration Mismatch
const themeListeners = new Set<() => void>();

function emitThemeChange() {
    themeListeners.forEach((listener) => listener());
}

function subscribeTheme(callback: () => void) {
    themeListeners.add(callback);
    if (typeof window !== "undefined") {
        window.addEventListener("storage", callback);
        const mql = window.matchMedia("(prefers-color-scheme: dark)");
        mql.addEventListener("change", callback);
    }
    return () => {
        themeListeners.delete(callback);
        if (typeof window !== "undefined") {
            window.removeEventListener("storage", callback);
            const mql = window.matchMedia("(prefers-color-scheme: dark)");
            mql.removeEventListener("change", callback);
        }
    };
}

function getThemeSnapshot(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("wheel-theme") as "light" | "dark" | null;
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getThemeServerSnapshot(): "light" | "dark" {
    return "light";
}

export default function WheelApp() {
    const [collections, setCollections] = useState<WheelCollection[]>(DEFAULT_COLLECTIONS);
    const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
    const [currentItems, setCurrentItems] = useState<WheelItem[]>([]);
    const [newCollectionName, setNewCollectionName] = useState<string>("");
    const [newItemText, setNewItemText] = useState<string>("");

    const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

    const [isResultDialogOpen, setIsResultDialogOpen] = useState<boolean>(false);
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [winner, setWinner] = useState<string | null>(null);
    const [winnerItem, setWinnerItem] = useState<WheelItem | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const currentRotationRef = useRef<number>(0);

    const activeCollection = collections.find((c) => c.id === activeCollectionId);

    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [theme]);

    const handleSelectCollection = (id: string) => {
        setActiveCollectionId(id);
        const found = collections.find((c) => c.id === id);
        if (found) {
            setCurrentItems([...found.items]);
            setWinner(null);
            setWinnerItem(null);
            currentRotationRef.current = 0;
        }
    };

    const handleBackToHome = () => {
        setActiveCollectionId(null);
        setWinner(null);
        setWinnerItem(null);
    };

    const handleDeleteCollection = (id: string) => {
        if (collections.length <= 1) return;
        setCollections(collections.filter((c) => c.id !== id));
    };

    const getItemColor = (item: WheelItem, index: number) => {
        return item.color || PASTEL_RAINBOW_COLORS[index % PASTEL_RAINBOW_COLORS.length];
    };

    const handleRandomizeColors = () => {
        if (currentItems.length === 0 || !activeCollectionId) return;
        const shuffled = [...PASTEL_RAINBOW_COLORS].sort(() => Math.random() - 0.5);
        let prevColor = "";
        const updatedItems = currentItems.map((item, idx) => {
            const available = shuffled.filter((c) => c !== prevColor);
            let chosen = available[idx % available.length] || shuffled[0];
            if (idx === currentItems.length - 1 && currentItems.length > 2) {
                const firstColor = currentItems[0]?.color;
                const noFirst = available.filter((c) => c !== firstColor);
                if (noFirst.length > 0) chosen = noFirst[0];
            }
            prevColor = chosen;
            return { ...item, color: chosen };
        });

        setCurrentItems(updatedItems);
        setCollections(
            collections.map((col) =>
                col.id === activeCollectionId ? { ...col, items: updatedItems } : col
            )
        );
    };

    const handleResetRainbowOrder = () => {
        if (!activeCollectionId) return;
        const updatedItems = currentItems.map((item, idx) => ({
            ...item,
            color: PASTEL_RAINBOW_COLORS[idx % PASTEL_RAINBOW_COLORS.length],
        }));
        setCurrentItems(updatedItems);
        setCollections(
            collections.map((col) =>
                col.id === activeCollectionId ? { ...col, items: updatedItems } : col
            )
        );
    };

    const drawWheel = useCallback((rotationAngle = 0, isDark = false) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) - 15;

        ctx.clearRect(0, 0, width, height);

        if (currentItems.length === 0) {
            ctx.fillStyle = isDark ? "#71717a" : "#a3a3a3";
            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("กรุณาเพิ่มรายการในวงล้อ", centerX, centerY);
            return;
        }

        const arcSize = (2 * Math.PI) / currentItems.length;

        currentItems.forEach((item, index) => {
            const angle = rotationAngle + index * arcSize;
            const itemColor = getItemColor(item, index);

            ctx.beginPath();
            ctx.fillStyle = itemColor;
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
            ctx.lineTo(centerX, centerY);
            ctx.fill();

            ctx.strokeStyle = isDark ? "#27272a" : "#ffffff";
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle + arcSize / 2);
            ctx.textAlign = "right";
            ctx.fillStyle = "#1e293b";
            ctx.font = "bold 13px sans-serif";

            const displayText = item.text.length > 14 ? item.text.substring(0, 12) + "..." : item.text;
            ctx.fillText(displayText, radius - 25, 5);
            ctx.restore();
        });

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = isDark ? "#3f3f46" : "#ffffff";
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 28, 0, 2 * Math.PI);
        ctx.fillStyle = isDark ? "#18181b" : "#ffffff";
        ctx.fill();
        ctx.strokeStyle = isDark ? "#3f3f46" : "#e2e8f0";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = isDark ? "#f4f4f5" : "#0f172a";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SPIN", centerX, centerY);
        ctx.restore();
    }, [currentItems]);

    useEffect(() => {
        if (activeCollectionId) {
            drawWheel(currentRotationRef.current, theme === "dark");
        }
    }, [drawWheel, theme, activeCollectionId]);

    const spinWheel = useCallback(() => {
        if (isSpinning || currentItems.length === 0) return;

        setIsSpinning(true);
        setWinner(null);
        setWinnerItem(null);

        const spins = 5 + Math.random() * 5;
        const extraAngle = Math.random() * 2 * Math.PI;
        const totalRotation = currentRotationRef.current + spins * 2 * Math.PI + extraAngle;

        const duration = 4000;
        const startTime = performance.now();

        const animateSpin = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentAngle = currentRotationRef.current + (totalRotation - currentRotationRef.current) * easeOut;

            drawWheel(currentAngle, theme === "dark");

            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                currentRotationRef.current = totalRotation % (2 * Math.PI);
                setIsSpinning(false);

                const arcSize = (2 * Math.PI) / currentItems.length;
                const normalizedAngle = (2 * Math.PI - (currentRotationRef.current % (2 * Math.PI))) % (2 * Math.PI);
                const winningIndex = Math.floor(normalizedAngle / arcSize);

                const selectedWinner = currentItems[winningIndex];
                setWinner(selectedWinner.text);
                setWinnerItem(selectedWinner);

                setIsResultDialogOpen(true);

                confetti({
                    particleCount: 75,
                    spread: 80,
                    origin: { y: 0.5 },
                    colors: PASTEL_RAINBOW_COLORS,
                });
            }
        };

        requestAnimationFrame(animateSpin);
    }, [isSpinning, currentItems, drawWheel, theme]);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemText.trim() || !activeCollectionId) return;

        const lastColor = currentItems[currentItems.length - 1]?.color;
        const available = PASTEL_RAINBOW_COLORS.filter((c) => c !== lastColor);
        const assignedColor =
            available[Math.floor(Math.random() * available.length)] ||
            PASTEL_RAINBOW_COLORS[currentItems.length % PASTEL_RAINBOW_COLORS.length];

        const newItem: WheelItem = {
            id: Date.now().toString(),
            text: newItemText.trim(),
            color: assignedColor,
        };

        const updatedItems = [...currentItems, newItem];
        setCurrentItems(updatedItems);
        setNewItemText("");

        setCollections(
            collections.map((col) =>
                col.id === activeCollectionId ? { ...col, items: updatedItems } : col
            )
        );
    };

    const handleDeleteItem = (id: string) => {
        if (!activeCollectionId) return;
        const updatedItems = currentItems.filter((item) => item.id !== id);
        setCurrentItems(updatedItems);

        setCollections(
            collections.map((col) =>
                col.id === activeCollectionId ? { ...col, items: updatedItems } : col
            )
        );
    };

    const handleCreateCollection = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCollectionName.trim()) return;

        const newCol: WheelCollection = {
            id: Date.now().toString(),
            name: newCollectionName.trim(),
            items: [
                { id: "d1", text: "ตัวเลือกที่ 1", color: PASTEL_RAINBOW_COLORS[0] },
                { id: "d2", text: "ตัวเลือกที่ 2", color: PASTEL_RAINBOW_COLORS[2] },
            ],
        };

        setCollections([...collections, newCol]);
        setNewCollectionName("");
        handleSelectCollection(newCol.id);
    };

    return (
        <main className="min-h-screen bg-background text-foreground transition-colors duration-200 p-4 sm:p-8 md:p-12">
            <div className="max-w-3xl mx-auto flex flex-col items-center">

                {!activeCollectionId ? (
                    <div className="w-full space-y-6 animate-fade-in">
                        <header className="text-center mb-8">
                            <h1 className="text-3xl font-bold tracking-tight mb-2">วงล้อมรณะ</h1>
                            <p className="text-sm text-muted-foreground">
                                เลือกคอลเลคชั่นหมวดหมู่ที่คุณต้องการสุ่ม หรือสร้างหมวดหมู่ใหม่ด้านล่าง
                            </p>
                        </header>

                        <Card className="border-border/80 shadow-sm">
                            <CardContent className="p-4 sm:p-6">
                                <form onSubmit={handleCreateCollection} className="flex gap-2">
                                    <Input
                                        type="text"
                                        placeholder="ชื่อหมวดหมู่ใหม่ เช่น ร้านอาหารโปรด, การบ้านวันนี้..."
                                        value={newCollectionName}
                                        onChange={(e) => setNewCollectionName(e.target.value)}
                                        className="text-sm"
                                    />
                                    <Button type="submit" className="cursor-pointer shrink-0">
                                        <FolderPlus className="size-4 mr-1.5" /> สร้างหมวดหมู่
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <div className="space-y-3">
                            <h2 className="text-sm font-medium text-muted-foreground px-1 flex items-center gap-2">
                                <Layers className="size-4 text-primary" /> คอลเลคชั่นทั้งหมด ({collections.length})
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {collections.map((col) => (
                                    <div
                                        key={col.id}
                                        onClick={() => handleSelectCollection(col.id)}
                                        className="group flex items-center justify-between p-4 bg-card rounded-2xl border border-border/80 shadow-xs hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <Bookmark className="size-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                                                    {col.name}
                                                </h3>
                                                <span className="text-xs text-muted-foreground">
                                                    {col.items.length} ตัวเลือก
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {collections.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteCollection(col.id);
                                                    }}
                                                    className="size-8 text-muted-foreground hover:text-destructive cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="ลบหมวดหมู่"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            )}
                                            <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full space-y-6 animate-fade-in">

                        <div className="flex items-center justify-between">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBackToHome}
                                className="cursor-pointer gap-1.5 text-xs"
                            >
                                <ArrowLeft className="size-3.5" /> กลับหน้าหมวดหมู่
                            </Button>
                            <Badge variant="secondary" className="text-xs px-3 py-1">
                                หมวดหมู่: {activeCollection?.name}
                            </Badge>
                        </div>

                        <div className="relative flex flex-col items-center justify-center p-6 sm:p-10 rounded-3xl bg-card border border-border shadow-sm w-full">
                            <div className="absolute top-4 sm:top-6 z-10 w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[20px] border-t-rose-500 drop-shadow-md" />

                            <div
                                role="button"
                                tabIndex={0}
                                aria-label="คลิกที่วงล้อเพื่อเริ่มหมุน"
                                onClick={!isSpinning && currentItems.length > 0 ? spinWheel : undefined}
                                onKeyDown={(e) => {
                                    if ((e.key === "Enter" || e.key === " ") && !isSpinning) {
                                        e.preventDefault();
                                        spinWheel();
                                    }
                                }}
                                className={cn(
                                    "relative my-3 select-none rounded-full transition-all duration-300 outline-none",
                                    !isSpinning && currentItems.length > 0
                                        ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl focus-visible:ring-4 focus-visible:ring-ring/40"
                                        : "cursor-not-allowed opacity-90"
                                )}
                                title={isSpinning ? "กำลังหมุน..." : "คลิกที่วงล้อเพื่อสุ่ม!"}
                            >
                                <canvas
                                    ref={canvasRef}
                                    width={340}
                                    height={340}
                                    className="max-w-full h-auto drop-shadow-md rounded-full"
                                />
                            </div>

                            <p className="text-xs text-muted-foreground/80 mb-5 flex items-center gap-1.5">
                                <Sparkles className="size-3 text-pink-500" />
                                คลิกที่ตัววงล้อ หรือกดปุ่มด้านล่างเพื่อสุ่ม
                            </p>

                            <Button
                                size="lg"
                                onClick={spinWheel}
                                disabled={isSpinning || currentItems.length === 0}
                                className={cn(
                                    "w-full sm:w-64 py-6 rounded-2xl text-base font-medium shadow-md transition-all cursor-pointer",
                                    isSpinning ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg active:scale-98"
                                )}
                            >
                                <RotateCw className={cn("size-4 mr-2", isSpinning && "animate-spin")} />
                                {isSpinning ? "กำลังหมุน..." : "หมุนวงล้อ"}
                            </Button>
                        </div>

                        <Card className="border-border/80 shadow-sm">
                            <CardContent className="p-5 sm:p-6 space-y-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <Layers className="size-4 text-primary" /> จัดการตัวเลือกในวงล้อ ({currentItems.length})
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">เพิ่มหรือลบตัวเลือกสำหรับหมวดหมู่นี้</p>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            onClick={handleRandomizeColors}
                                            className="cursor-pointer text-xs h-8"
                                            title="สุ่มสีรุ้งพาสเทลใหม่ทุกช่อง"
                                        >
                                            <Shuffle className="size-3 text-pink-500 mr-1" /> สุ่มสี
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            onClick={handleResetRainbowOrder}
                                            className="cursor-pointer text-xs h-8"
                                            title="เรียงสีรุ้งตามสเปกตรัมธรรมชาติ"
                                        >
                                            <Palette className="size-3 text-indigo-500 mr-1" /> เรียงสีรุ้ง
                                        </Button>
                                    </div>
                                </div>

                                <form onSubmit={handleAddItem} className="flex gap-2">
                                    <Input
                                        type="text"
                                        placeholder="พิมพ์ตัวเลือกใหม่..."
                                        value={newItemText}
                                        onChange={(e) => setNewItemText(e.target.value)}
                                        className="text-xs sm:text-sm"
                                    />
                                    <Button type="submit" className="cursor-pointer shrink-0">
                                        <Plus className="size-4 mr-1" /> เพิ่ม
                                    </Button>
                                </form>

                                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-border/70 rounded-xl p-2 bg-muted/20">
                                    {currentItems.map((item, idx) => {
                                        const color = getItemColor(item, idx);
                                        return (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between px-3 py-2 bg-card rounded-lg text-xs sm:text-sm border border-border/70 transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span
                                                        className="size-3.5 rounded-full shrink-0 border border-black/10"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                    <span className="font-medium text-foreground truncate">
                                                        {idx + 1}. {item.text}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    type="button"
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    disabled={currentItems.length <= 2}
                                                    className="size-7 text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-30"
                                                    title={currentItems.length <= 2 ? "ต้องมีอย่างน้อย 2 รายการ" : "ลบตัวเลือกนี้"}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                )}
            </div>
        </main>
    );
}
