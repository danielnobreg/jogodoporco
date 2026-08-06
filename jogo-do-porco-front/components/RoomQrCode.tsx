"use client";
 
import { QRCodeSVG } from "qrcode.react";
 
interface RoomQrCodeProps {
  roomCode: string;
}
 
export function RoomQrCode({ roomCode }: RoomQrCodeProps) {
  const joinUrl = `${window.location.origin}/join?code=${roomCode}`;
 
  return (
    <div className="relative p-1 rounded-2xl bg-gradient-to-br from-[#D97706]/20 to-[#C9A227]/5 border border-[#C9A227]/20 shadow-xl max-w-[200px] w-full mx-auto">
      <div className="flex flex-col items-center gap-3 bg-[#FDFBF7] p-5 rounded-[calc(1rem-3px)] border border-[#C9A227]/10 shadow-inner">
        <div className="p-1.5 bg-white rounded-lg shadow-sm border border-black/5">
          <QRCodeSVG value={joinUrl} size={140} fgColor="#0A2B20" bgColor="#FFFFFF" />
        </div>
        <div className="text-center w-full border-t border-[#0A2B20]/10 pt-2.5">
          <p className="text-[10px] text-[#0A2B20]/60 uppercase tracking-widest font-body font-black">Código da sala</p>
          <p className="font-display text-2xl font-black tracking-widest text-[#0A2B20] mt-0.5 select-all">
            {roomCode}
          </p>
        </div>
      </div>
    </div>
  );
}