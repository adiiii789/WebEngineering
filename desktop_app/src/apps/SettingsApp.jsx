import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { SettingsAppStyles } from '../AppStyles';

export default function SettingsApp({ brightness, setBrightness, darkMode, setDarkMode }) {

    const style = SettingsAppStyles(darkMode)

    return ( //as described, its just a getter/ setter
        <div className="space-y-6">

            {/* Dark Mode Toggle */}
            <div className={style.darkModeToggleWrapper}>
                <label className={style.darkModeToggleLabel}>
                    Dark Mode
                </label>
                <button
                    onClick={() => setDarkMode(prev => !prev)} //inverts current
                    className={style.darkModeToggle}
                >
                    {darkMode
                        ? <><Moon size={14} /> An</> //it works just like that
                        : <><Sun  size={14} /> Aus</> 
                    }
                </button>
            </div>

            {/* brightness */}
            <div>
                <label className={style.brightnessLabel}>
                    Helligkeit
                </label>
                <input
                    type="range"
                    min="30" //shouldn't be black, just dark
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(e.target.value)} //set based on value
                    className={style.brightness}
                />
            </div>

        </div>
    );
}