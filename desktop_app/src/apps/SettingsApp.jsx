import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { SettingsAppStyles } from '../AppStyles';

export default function SettingsApp({ brightness, setBrightness, darkMode, setDarkMode }) {

    const style = SettingsAppStyles(darkMode)

    return (
        <div className="space-y-6">

            {/* Dark Mode Toggle */}
            <div className={style.darkModeToggleWrapper}>
                <label className={style.darkModeToggleLabel}>
                    Dark Mode
                </label>
                <button
                    onClick={() => setDarkMode(prev => !prev)}
                    className={style.darkModeToggle}
                >
                    {darkMode
                        ? <><Moon size={14} /> An</>
                        : <><Sun  size={14} /> Aus</>
                    }
                </button>
            </div>

            {/* Helligkeit */}
            <div>
                <label className={style.brightnessLabel}>
                    Helligkeit
                </label>
                <input
                    type="range"
                    min="30"
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(e.target.value)}
                    className={style.brightness}
                />
            </div>

        </div>
    );
}