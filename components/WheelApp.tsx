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
    Sun,
    Moon,
    SlidersHorizontal,
    Check,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// พาเลทสีรุ้งโทนพาสเทล สดใสละมุนตา (Pastel Rainbow Colors)
export const PASTEL_RAINBOW_COLORS = [
    "#FFB3BA", // 1. แดง/ชมพูกุหลาบพาสเทล
    "#FFD6A5", // 2. ส้มแอปริคอทพาสเทล
    "#FFDFBA", // 3. ส้มพีชพาสเทล
    "#FFFFBA", // 4. เหลืองละมุนพาสเทล
    "#CAFFBF", // 5. เขียวตองอ่อนพาสเทล
    "#BAFFC9", // 6. เขียวมิ้นต์พาสเทล
    "#9BF6FF", // 7. ฟ้าไอซ์พาสเทล
    "#BAE1FF", // 8. ฟ้าสดใสพาสเทล
    "#A0C4FF", // 9. น้ำเงินอ่อนพาสเทล
    "#BDB2FF", // 10. คราม/ม่วงอ่อนพาสเทล
    "#C7CEEA", // 11. ม่วงลาเวนเดอร์พาสเทล
    "#FFC6FF", // 12. ชมพูหวานพาสเทล
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

// Theme External Store เพื่อป้องกันปัญหา Hydration Mismatch ระหว่าง Server/Client
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

function saveTheme(nextTheme: "light" | "dark") {
    if (typeof window !== "undefined") {
        localStorage.setItem("wheel-theme", nextTheme);
        if (nextTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        emitThemeChange();
    }
}

export default function WheelApp() {
    const [collections, setCollections] = useState<WheelCollection[]>(DEFAULT_COLLECTIONS);
    const [activeCollectionId, setActiveCollectionId] = useState<string>("1");
    const [currentItems, setCurrentItems] = useState<WheelItem[]>(DEFAULT_COLLECTIONS[0].items);
    const [newCollectionName, setNewCollectionName] = useState<string>("");
    const [newItemText, setNewItemText] = useState<string>("");

    // จัดการ Theme ผ่าน useSyncExternalStore ปลอดภัยจาก Hydration mismatch
    const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

    // สถานะ Dialog
    const [isManageDialogOpen, setIsManageDialogOpen] = useState<boolean>(false);
    const [isResultDialogOpen, setIsResultDialogOpen] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<string>("items");

    // สถานะการหมุน
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [winner, setWinner] = useState<string | null>(null);
    const [winnerItem, setWinnerItem] = useState<WheelItem | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const currentRotationRef = useRef<number>(0);

    const activeCollection = collections.find((c) => c.id === activeCollectionId) || collections[0];

    // ซิงค์ class .dark กับ <html> เมื่อ theme เปลี่ยน
    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [theme]);

    // สลับ Theme Light / Dark
    const toggleTheme = () => {
        const nextTheme = theme === "light" ? "dark" : "light";
        saveTheme(nextTheme);
    };

    // รับสีของรายการ (ถ้ามี color ใน item ให้ใช้ หรือ fallback เป็นสีตาม index ในชุดสีรุ้งพาสเทล)
    const getItemColor = (item: WheelItem, index: number) => {
        return item.color || PASTEL_RAINBOW_COLORS[index % PASTEL_RAINBOW_COLORS.length];
    };

    // เปลี่ยนคอลเลคชั่นที่เลือก
    const handleSelectCollection = (id: string) => {
        setActiveCollectionId(id);
        const found = collections.find((c) => c.id === id);
        if (found) {
            setCurrentItems([...found.items]);
            setWinner(null);
            setWinnerItem(null);
        }
    };

    // ลบคอลเลคชั่น
    const handleDeleteCollection = (id: string) => {
        if (collections.length <= 1) return;
        const remaining = collections.filter((c) => c.id !== id);
        setCollections(remaining);
        if (activeCollectionId === id) {
            setActiveCollectionId(remaining[0].id);
            setCurrentItems([...remaining[0].items]);
            setWinner(null);
            setWinnerItem(null);
        }
    };

    // ฟังก์ชันสุ่มสีรุ้งพาสเทลใหม่ทั้งหมด โดยหลีกเลี่ยงสีซ้ำติดกัน
    const handleRandomizeColors = () => {
        if (currentItems.length === 0) return;
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

    // ฟังก์ชันเรียงสีรุ้งพาสเทลตามสเปกตรัมธรรมชาติ
    const handleResetRainbowOrder = () => {
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

    // วาดวงล้อลงบน Canvas
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

            // วาดชิ้นส่วนพาย
            ctx.beginPath();
            ctx.fillStyle = itemColor;
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
            ctx.lineTo(centerX, centerY);
            ctx.fill();

            // เส้นขอบสีขาวตัดระหว่างชิ้นส่วน
            ctx.strokeStyle = isDark ? "#27272a" : "#ffffff";
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // วาดข้อความตัวอักษร (ใช้สี slate เข้มเพื่อให้ตัดกับสีพาสเทล คมชัดและอ่านง่าย)
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle + arcSize / 2);
            ctx.textAlign = "right";
            ctx.fillStyle = "#1e293b";
            ctx.font = "bold 13px sans-serif";

            // ตัดข้อความถ้ายาวเกินไป
            const displayText = item.text.length > 14 ? item.text.substring(0, 12) + "..." : item.text;
            ctx.fillText(displayText, radius - 25, 5);
            ctx.restore();
        });

        // ขอบนอกวงล้อ
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = isDark ? "#3f3f46" : "#ffffff";
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // วงกลมตรงกลางวงล้อ (ฝาปิดตรงกลางวงล้อ)
        ctx.beginPath();
        ctx.arc(centerX, centerY, 28, 0, 2 * Math.PI);
        ctx.fillStyle = isDark ? "#18181b" : "#ffffff";
        ctx.fill();
        ctx.strokeStyle = isDark ? "#3f3f46" : "#e2e8f0";
        ctx.lineWidth = 3;
        ctx.stroke();

        // ตัวอักษร "SPIN" ตรงกลางวงล้อ
        ctx.save();
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = isDark ? "#f4f4f5" : "#0f172a";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SPIN", centerX, centerY);
        ctx.restore();
    }, [currentItems]);

    useEffect(() => {
        drawWheel(currentRotationRef.current, theme === "dark");
    }, [drawWheel, theme]);

    // ฟังก์ชันสุ่มหมุนวงล้อ
    const spinWheel = useCallback(() => {
        if (isSpinning || currentItems.length === 0) return;

        setIsSpinning(true);
        setWinner(null);
        setWinnerItem(null);

        const spins = 5 + Math.random() * 5; // หมุนอย่างน้อย 5 รอบ
        const extraAngle = Math.random() * 2 * Math.PI;
        const totalRotation = currentRotationRef.current + spins * 2 * Math.PI + extraAngle;

        const duration = 4000; // 4 วินาที
        const startTime = performance.now();

        const animateSpin = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing Function ให้ค่อยๆ หยุดนุ่มนวล (Ease-Out Cubic)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentAngle = currentRotationRef.current + (totalRotation - currentRotationRef.current) * easeOut;

            drawWheel(currentAngle, theme === "dark");

            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                currentRotationRef.current = totalRotation % (2 * Math.PI);
                setIsSpinning(false);

                // คำนวณหาผู้ชนะจากมุมที่หยุด
                const arcSize = (2 * Math.PI) / currentItems.length;
                const normalizedAngle = (2 * Math.PI - (currentRotationRef.current % (2 * Math.PI))) % (2 * Math.PI);
                const winningIndex = Math.floor(normalizedAngle / arcSize);

                const selectedWinner = currentItems[winningIndex];
                setWinner(selectedWinner.text);
                setWinnerItem(selectedWinner);

                // เปิด Dialog แสดงผลลัพธ์
                setIsResultDialogOpen(true);

                // ยิงพลุฉลองด้วยสีรุ้งพาสเทล
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

    // หมุนอีกครั้งจาก Dialog
    const handleSpinAgainFromDialog = () => {
        setIsResultDialogOpen(false);
        setTimeout(() => {
            spinWheel();
        }, 200);
    };

    // ลบตัวเลือกที่เป็นผู้ชนะออกจากวงล้อ แล้วปิด Dialog
    const handleRemoveWinnerAndClose = () => {
        if (!winnerItem) return;
        handleDeleteItem(winnerItem.id);
        setIsResultDialogOpen(false);
    };

    // เพิ่มรายการใหม่เข้าไปในคอลเลคชั่นปัจจุบัน
    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemText.trim()) return;

        // สุ่มสีรุ้งพาสเทลที่ไม่ซ้ำกับตัวล่าสุด
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

        // อัปเดตข้อมูลในคอลเลคชั่นหลักด้วย
        setCollections(
            collections.map((col) =>
                col.id === activeCollectionId ? { ...col, items: updatedItems } : col
            )
        );
    };

    // ลบรายการออกจากวงล้อ
    const handleDeleteItem = (id: string) => {
        const updatedItems = currentItems.filter((item) => item.id !== id);
        setCurrentItems(updatedItems);

        setCollections(
            collections.map((col) =>
                col.id === activeCollectionId ? { ...col, items: updatedItems } : col
            )
        );
    };

    // สร้างคอลเลคชั่นใหม่
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
        setActiveCollectionId(newCol.id);
        setCurrentItems(newCol.items);
        setWinner(null);
        setWinnerItem(null);
    };

    return (
        <main className="min-h-screen bg-background text-foreground transition-colors duration-200 p-4 sm:p-8 md:p-12">
            <div className="max-w-4xl mx-auto flex flex-col items-center">

                {/* Header & Theme Toggle */}
                <header className="w-full flex items-center justify-between mb-8 pb-4 border-b border-border/60">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1.5 px-3 py-1 rounded-full text-xs font-medium border-border shadow-2xs">
                            <Sparkles className="size-3.5 text-pink-500" />
                            <span>Pastel Rainbow</span>
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            className="rounded-full cursor-pointer hover:bg-muted"
                            title={theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
                            aria-label="สลับโหมดสี"
                            suppressHydrationWarning
                        >
                            {theme === "dark" ? (
                                <Sun className="size-4 text-amber-400 transition-transform rotate-0" />
                            ) : (
                                <Moon className="size-4 text-slate-700 transition-transform rotate-0" />
                            )}
                        </Button>
                    </div>
                </header>

                {/* ส่วนหัวข้อหลัก */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">
                        Pastel Rainbow Spin Wheel
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        หมุนสุ่มเลือกสิ่งที่ต้องการ ด้วยวงล้อสีรุ้งพาสเทล คลิกที่วงล้อหรือกดปุ่มเพื่อหมุน
                    </p>
                </div>

                {/* แถบสถานะหมวดหมู่ & ปุ่มเปิด Dialog ปรับแต่งตัวเลือก */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setActiveTab("collections");
                            setIsManageDialogOpen(true);
                        }}
                        className="rounded-full gap-1.5 text-xs cursor-pointer shadow-2xs"
                    >
                        <Bookmark className="size-3.5 text-pink-500" />
                        <span>หมวดหมู่: {activeCollection.name}</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setActiveTab("items");
                            setIsManageDialogOpen(true);
                        }}
                        className="rounded-full gap-1.5 text-xs cursor-pointer shadow-2xs"
                    >
                        <SlidersHorizontal className="size-3.5 text-indigo-500" />
                        <span>ปรับแต่งตัวเลือก ({currentItems.length})</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRandomizeColors}
                        className="rounded-full gap-1.5 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                        title="สุ่มสีรุ้งพาสเทลใหม่ทุกช่อง"
                    >
                        <Shuffle className="size-3.5 text-pink-500" />
                        <span>สุ่มสีรุ้ง</span>
                    </Button>
                </div>

                {/* พื้นที่วงล้อสุ่ม (คลิกตรงวงล้อเพื่อสุ่มได้) */}
                <div className="relative flex flex-col items-center justify-center p-6 sm:p-10 rounded-3xl bg-card border border-border shadow-sm max-w-md w-full">

                    {/* เข็มชี้หมุดด้านบน */}
                    <div className="absolute top-4 sm:top-6 z-10 w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[20px] border-t-rose-500 drop-shadow-md" />

                    {/* วงล้อ Canvas - คลิกเพื่อหมุนได้ */}
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

                    {/* ปุ่มกดหมุนวงล้อ */}
                    <Button
                        size="lg"
                        onClick={spinWheel}
                        disabled={isSpinning || currentItems.length === 0}
                        className={cn(
                            "w-full sm:w-64 py-6 rounded-2xl text-base font-medium shadow-md transition-all cursor-pointer",
                            isSpinning
                                ? "opacity-70 cursor-not-allowed"
                                : "hover:shadow-lg active:scale-98"
                        )}
                    >
                        <RotateCw className={cn("size-4 mr-2", isSpinning && "animate-spin")} />
                        {isSpinning ? "กำลังหมุน..." : "หมุนวงล้อ"}
                    </Button>

                    {/* แสดงตัวเลือกย่อด้านล่าง */}
                    <div className="mt-6 pt-5 border-t border-border/60 w-full">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                            <span>ตัวเลือกในวงล้อ:</span>
                            <button
                                onClick={() => {
                                    setActiveTab("items");
                                    setIsManageDialogOpen(true);
                                }}
                                className="text-primary hover:underline cursor-pointer"
                            >
                                จัดการรายการ
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {currentItems.map((item, idx) => {
                                const color = getItemColor(item, idx);
                                return (
                                    <span
                                        key={item.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted/60 text-muted-foreground border border-border/50"
                                    >
                                        <span
                                            className="size-2 rounded-full shrink-0"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className="truncate max-w-[120px]">{item.text}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                </div>

            </div>

            {/* ========================================================
                Dialog: จัดการตัวเลือก & คอลเลคชั่นหมวดหมู่
               ======================================================== */}
            <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <SlidersHorizontal className="size-4 text-primary" />
                            จัดการตัวเลือก & หมวดหมู่
                        </DialogTitle>
                        <DialogDescription>
                            เพิ่ม ลบ หรือแก้ไขตัวเลือกในวงล้อ และสลับคอลเลคชั่นหมวดหมู่ที่ต้องการ
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs
                        value={activeTab}
                        onValueChange={(val) => setActiveTab(val as string)}
                        className="mt-2"
                    >
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="items" className="text-xs sm:text-sm">
                                ตัวเลือกในวงล้อ ({currentItems.length})
                            </TabsTrigger>
                            <TabsTrigger value="collections" className="text-xs sm:text-sm">
                                คอลเลคชั่นหมวดหมู่ ({collections.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* แท็บที่ 1: ปรับแต่งตัวเลือกในวงล้อ */}
                        <TabsContent value="items" className="space-y-4 pt-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    หมวดหมู่ปัจจุบัน: <strong>{activeCollection.name}</strong>
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="xs"
                                        type="button"
                                        onClick={handleRandomizeColors}
                                        className="cursor-pointer"
                                        title="สุ่มสีรุ้งพาสเทลใหม่ทุกช่อง"
                                    >
                                        <Shuffle className="size-3 text-pink-500 mr-1" /> สุ่มสี
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="xs"
                                        type="button"
                                        onClick={handleResetRainbowOrder}
                                        className="cursor-pointer"
                                        title="เรียงสีรุ้งตามสเปกตรัมธรรมชาติ"
                                    >
                                        <Palette className="size-3 text-indigo-500 mr-1" /> เรียงสีรุ้ง
                                    </Button>
                                </div>
                            </div>

                            {/* ฟอร์มเพิ่มรายการ */}
                            <form onSubmit={handleAddItem} className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="พิมพ์ตัวเลือกใหม่..."
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    className="text-xs sm:text-sm"
                                />
                                <Button type="submit" size="default" className="cursor-pointer shrink-0">
                                    <Plus className="size-4 mr-1" /> เพิ่ม
                                </Button>
                            </form>

                            {/* รายการตัวเลือก */}
                            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-border rounded-xl p-2 bg-muted/20">
                                {currentItems.map((item, idx) => {
                                    const color = getItemColor(item, idx);
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between px-3 py-2 bg-card rounded-lg text-xs sm:text-sm border border-border/70 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span
                                                    className="size-3.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <span className="font-medium text-foreground truncate">
                                                    {idx + 1}. {item.text}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                type="button"
                                                onClick={() => handleDeleteItem(item.id)}
                                                disabled={currentItems.length <= 2}
                                                className="text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-30"
                                                title={currentItems.length <= 2 ? "ต้องมีอย่างน้อย 2 รายการ" : "ลบตัวเลือกนี้"}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        {/* แท็บที่ 2: จัดการคอลเลคชั่นหมวดหมู่ */}
                        <TabsContent value="collections" className="space-y-4 pt-3">
                            <div className="space-y-2">
                                <span className="text-xs text-muted-foreground">
                                    เลือกหมวดหมู่ที่ต้องการใช้งาน:
                                </span>
                                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 border border-border rounded-xl p-2 bg-muted/20">
                                    {collections.map((col) => {
                                        const isActive = col.id === activeCollectionId;
                                        return (
                                            <div
                                                key={col.id}
                                                className={cn(
                                                    "flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm border transition-all cursor-pointer",
                                                    isActive
                                                        ? "bg-primary text-primary-foreground border-primary font-medium"
                                                        : "bg-card text-card-foreground border-border/70 hover:bg-muted"
                                                )}
                                                onClick={() => handleSelectCollection(col.id)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isActive ? (
                                                        <Check className="size-4" />
                                                    ) : (
                                                        <Bookmark className="size-3.5 text-muted-foreground" />
                                                    )}
                                                    <span>{col.name}</span>
                                                    <span className={cn(
                                                        "text-xs px-2 py-0.5 rounded-full",
                                                        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {col.items.length} รายการ
                                                    </span>
                                                </div>

                                                {collections.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteCollection(col.id);
                                                        }}
                                                        className={cn(
                                                            "cursor-pointer",
                                                            isActive
                                                                ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/20"
                                                                : "text-muted-foreground hover:text-destructive"
                                                        )}
                                                        title="ลบหมวดหมู่นี้"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ฟอร์มสร้างหมวดหมู่ใหม่ */}
                            <form onSubmit={handleCreateCollection} className="flex gap-2 pt-2 border-t border-border">
                                <Input
                                    type="text"
                                    placeholder="ชื่อหมวดหมู่ใหม่..."
                                    value={newCollectionName}
                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                    className="text-xs sm:text-sm"
                                />
                                <Button type="submit" size="default" className="cursor-pointer shrink-0">
                                    <FolderPlus className="size-4 mr-1" /> สร้าง
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-4 pt-3 border-t border-border">
                        <Button
                            type="button"
                            onClick={() => setIsManageDialogOpen(false)}
                            className="w-full sm:w-auto cursor-pointer"
                        >
                            เสร็จสิ้น
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================================
                Dialog: แสดงผลการสุ่มวงล้อ (Winner Result)
               ======================================================== */}
            <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
                <DialogContent className="sm:max-w-md text-center">
                    <DialogHeader className="items-center text-center">
                        <div className="mx-auto size-14 rounded-full bg-linear-to-tr from-pink-100 via-amber-100 to-indigo-100 dark:from-pink-950 dark:via-amber-950 dark:to-indigo-950 flex items-center justify-center mb-1">
                            <Sparkles className="size-7 text-pink-500 animate-bounce" />
                        </div>
                        <DialogTitle className="text-xl sm:text-2xl font-bold">
                            ผลการสุ่มวงล้อ!
                        </DialogTitle>
                        <DialogDescription>
                            วงล้อสีรุ้งพาสเทลได้เลือกตัวเลือกนี้ให้คุณแล้ว
                        </DialogDescription>
                    </DialogHeader>

                    {/* กล่องแสดงผลผู้ชนะ */}
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
                            {activeCollection.name}
                        </Badge>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsResultDialogOpen(false)}
                            className="w-full sm:w-auto cursor-pointer"
                        >
                            ปิด
                        </Button>

                        {currentItems.length > 2 && (
                            <Button
                                variant="destructive"
                                onClick={handleRemoveWinnerAndClose}
                                className="w-full sm:w-auto cursor-pointer"
                            >
                                <Trash2 className="size-4 mr-1.5" /> ลบตัวเลือกนี้ออก
                            </Button>
                        )}

                        <Button
                            variant="default"
                            onClick={handleSpinAgainFromDialog}
                            className="w-full sm:w-auto cursor-pointer"
                        >
                            <RotateCw className="size-4 mr-1.5" /> หมุนอีกครั้ง
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </main>
    );
}
