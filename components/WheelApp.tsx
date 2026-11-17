"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WheelCollection, WheelItem } from "@/types/wheel";
import { Plus, Trash2, RotateCw, Bookmark, FolderPlus, Sparkles, Shuffle, Palette } from "lucide-react";
import confetti from "canvas-confetti";

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

export default function WheelApp() {
    const [collections, setCollections] = useState<WheelCollection[]>(DEFAULT_COLLECTIONS);
    const [activeCollectionId, setActiveCollectionId] = useState<string>("1");
    const [currentItems, setCurrentItems] = useState<WheelItem[]>(DEFAULT_COLLECTIONS[0].items);
    const [newCollectionName, setNewCollectionName] = useState<string>("");
    const [newItemText, setNewItemText] = useState<string>("");

    // สถานะการหมุน
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [winner, setWinner] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const currentRotationRef = useRef<number>(0);

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
    const drawWheel = useCallback((rotationAngle = 0) => {
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
            ctx.fillStyle = "#a3a3a3";
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
            ctx.strokeStyle = "#ffffff";
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

        // ขอบนอกวงล้อสีขาวเนียน
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();

        // วงกลมตรงกลางวงล้อ (ดีไซน์สีขาวสะอาดตา ตัดขอบเรียบหรู)
        ctx.beginPath();
        ctx.arc(centerX, centerY, 24, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 3;
        ctx.stroke();

        // จุดศูนย์กลาง
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
        ctx.fillStyle = "#64748b";
        ctx.fill();
    }, [currentItems]);

    useEffect(() => {
        drawWheel(currentRotationRef.current);
    }, [drawWheel]);

    // ฟังก์ชันสุ่มหมุนวงล้อ
    const spinWheel = () => {
        if (isSpinning || currentItems.length === 0) return;

        setIsSpinning(true);
        setWinner(null);

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

            drawWheel(currentAngle);

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

                // ยิงพลุฉลองด้วยสีรุ้งพาสเทล
                confetti({
                    particleCount: 65,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: PASTEL_RAINBOW_COLORS,
                });
            }
        };

        requestAnimationFrame(animateSpin);
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
    };

    return (
        <main className="min-h-screen bg-[#fafafa] text-[#171717] font-sans p-6 md:p-12">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <header className="mb-10 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-linear-to-r from-pink-100 via-amber-100 to-indigo-100 text-neutral-700 text-xs font-medium mb-3 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                        วงล้อสุ่มสีรุ้งพาสเทล
                    </div>
                    <h1 className="text-3xl font-light tracking-tight mb-2">Pastel Rainbow Spin Wheel</h1>
                    <p className="text-sm text-neutral-500">หมุนสุ่มเลือกสิ่งที่คุณต้องการ ด้วยโทนสีรุ้งพาสเทลละมุนสดใส</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* ส่วนซ้าย: เลือกคอลเลคชั่น และจัดการตัวเลือกรายการ (5 columns) */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* กล่องจัดการคอลเลคชั่น */}
                        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                            <h2 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
                                <Bookmark className="w-4 h-4 text-neutral-500" /> คอลเลคชั่นหมวดหมู่
                            </h2>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {collections.map((col) => (
                                    <button
                                        key={col.id}
                                        onClick={() => handleSelectCollection(col.id)}
                                        className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                                            activeCollectionId === col.id
                                                ? "bg-neutral-900 text-white font-medium shadow-sm"
                                                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                        }`}
                                    >
                                        {col.name}
                                    </button>
                                ))}
                            </div>

                            {/* ฟอร์มสร้างคอลเลคชั่นใหม่ */}
                            <form onSubmit={handleCreateCollection} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="ชื่อหมวดหมู่ใหม่..."
                                    value={newCollectionName}
                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                                />
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-lg hover:bg-neutral-800 transition flex items-center gap-1 cursor-pointer"
                                >
                                    <FolderPlus className="w-3.5 h-3.5" /> สร้าง
                                </button>
                            </form>
                        </div>

                        {/* กล่องเพิ่ม/ลบรายการในวงล้อ */}
                        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-medium text-neutral-700">
                                    ปรับแต่งตัวเลือก ({currentItems.length})
                                </h2>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleRandomizeColors}
                                        title="สุ่มสีรุ้งพาสเทลใหม่ให้ทุกช่อง"
                                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition cursor-pointer active:scale-95"
                                    >
                                        <Shuffle className="w-3 h-3 text-pink-500" /> สุ่มสี
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetRainbowOrder}
                                        title="เรียงสีรุ้งพาสเทลตามสเปกตรัม"
                                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition cursor-pointer active:scale-95"
                                    >
                                        <Palette className="w-3 h-3 text-indigo-500" /> เรียงสีรุ้ง
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="เพิ่มตัวเลือกใหม่..."
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    className="flex-1 px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                                />
                                <button
                                    type="submit"
                                    className="px-3 py-2 bg-neutral-900 text-white text-xs rounded-lg hover:bg-neutral-800 transition flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" /> เพิ่ม
                                </button>
                            </form>

                            {/* รายการ Items พร้อมแถบสีรุ้งพาสเทล */}
                            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                                {currentItems.map((item, idx) => {
                                    const itemColor = getItemColor(item, idx);
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-xl text-xs border border-neutral-100 transition-colors hover:bg-neutral-100/60"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 shadow-xs"
                                                    style={{ backgroundColor: itemColor }}
                                                    title={`สี: ${itemColor}`}
                                                />
                                                <span className="text-neutral-700 font-medium truncate">
                                                    {idx + 1}. {item.text}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="text-neutral-400 hover:text-red-500 transition ml-2 cursor-pointer"
                                                disabled={currentItems.length <= 2}
                                                title={currentItems.length <= 2 ? "ต้องมีอย่างน้อย 2 รายการ" : "ลบรายการ"}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* ส่วนขวา: วงล้อสุ่ม และผลลัพธ์ (7 columns) */}
                    <div className="lg:col-span-7 flex flex-col items-center justify-center bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden">

                        {/* ตัวชี้เข็มหมุดด้านบน */}
                        <div className="absolute top-4 z-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-rose-500 drop-shadow-md" />

                        {/* Canvas วงล้อ */}
                        <div className="relative my-4">
                            <canvas
                                ref={canvasRef}
                                width={320}
                                height={320}
                                className="max-w-full h-auto drop-shadow-md transition-transform"
                            />
                        </div>

                        {/* ปุ่มกดหมุน */}
                        <button
                            onClick={spinWheel}
                            disabled={isSpinning || currentItems.length === 0}
                            className={`mt-4 px-8 py-3 rounded-xl text-sm font-medium tracking-wide transition flex items-center gap-2 shadow-sm cursor-pointer ${
                                isSpinning
                                    ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                                    : "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-98"
                            }`}
                        >
                            <RotateCw className={`w-4 h-4 ${isSpinning ? "animate-spin" : ""}`} />
                            {isSpinning ? "กำลังหมุน..." : "หมุนวงล้อ"}
                        </button>

                        {/* แสดงผลผู้ชนะ */}
                        {winner && (
                            <div className="mt-6 p-4 bg-linear-to-r from-rose-50/60 via-amber-50/60 to-indigo-50/60 border border-neutral-200 rounded-xl text-center w-full max-w-xs animate-fade-in shadow-xs">
                                <span className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">ผลลัพธ์ที่ได้</span>
                                <span className="text-lg font-semibold text-neutral-800 flex items-center justify-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-amber-500" /> {winner}
                                </span>
                            </div>
                        )}

                    </div>

                </div>

            </div>
        </main>
    );
}
