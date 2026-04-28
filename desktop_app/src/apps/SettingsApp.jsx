import React, { useState, useEffect } from 'react';

export default function SettingsApp({ brightness, setBrightness, darkMode }) {

    return (
        <div className="space-y-6">
            <label 
                className="
                    text-[10px] 
                    font-black 
                    text-gray-400 
                    uppercase 
                    tracking-widest 
                    block">
                Helligkeit
            </label>
            <input 
                type="range" 
                min="30" 
                max="100" 
                value={brightness} 
                onChange={(e) => setBrightness(e.target.value)} 
                className="w-full 
                accent-blue-600" 
            />
            <div 
                className="
                    text-[11px] 
                    text-gray-400">
            </div>
        </div>
    );
}