
export const styles = (dark) => ({ 
    
    // Special Stylesheet because Tailwind kinda works different

    body: `
        fixed 
        inset-0 
        w-screen 
        h-screen 
        overflow-hidden 
        flex 
        flex-col 
        ${dark ? 'bg-black' : 'bg-white'}
        font-sans 
        select-none
    `,

    iframe: `
        absolute 
        inset-0 
        w-full 
        h-full 
        border-none 
        pointer-events-auto        
    `,

    appWrapper: `
        relative
        flex-grow
        p-4
    `,

    settingsWrapper: `
        absolute 
        top-[10%] 
        right-[5%] 
        flex 
        flex-col 
        items-end 
        pointer-events-none
    `,

    taskbar: `
        h-16
        w-full
        ${dark ? 'bg-black/10 border-black/20' : 'bg-white/10 border-white/20'}
        border-t
        flex
        items-center
        justify-between
        px-6
        sm:px-10
        z-200
    `,

    taskbarIcons: `
        flex
        gap-4
        overflow-hidden
        flex-shrink-0
        max-w-[55%]
    `,

    taskbarButton: `
        w-11 
        h-11 
        rounded-2xl 
        flex items-center justify-center
        overflow-hidden 
        hover:scale-110 
        transition-all 
        shadow-lg 
        active:scale-95
    `,

    taskbarTime: `
        text-center
        text-sm
        sm:text-xl
        font-light
        tracking-tighter
        border-l
        ${dark ? 'border-white/10 text-white' : 'border-black/10 text-gray-800'}
        pl-4
        sm:pl-6
        tabular-nums
        shrink-0
    `,

    taskbarUser: `
        text-center
        text-xs
        max-w-[60px]
        sm:max-w-[120px]
        truncate
        ${dark ? 'text-white/40' : 'text-gray-500'}
    `,

});

export const weatherStyles = (dark, isWeatherOpen) => ({
    sun: `
        text-yellow-400
    `,

    cloudSun: `
        text-gray-400
    `,

    cloudFog: `
        text-slate-400
    `,

    cloudDrizzle: `
        text-blue-300
    `,

    cloudRain1: `
        text-blue-500
    `,

    snowFlake: `
        text-sky-200
    `,

    // 500 != 600
    cloudRain2: `
        text-blue-600 
    `,

    cloudSnow: `
        text-blue-100
    `,

    cloudLightning: `
        text-purple-500
    `,

    cloud: `
        text-gray-400
    `,
    
    clockWrapper: `
        flex 
        items-center 
        gap-4 
        sm:gap-6 
        ${dark ? 'text-white' : 'text-gray-800'}
        relative
    `,

    button: `
        flex 
        flex-col 
        items-end 
        p-2 
        px-3 
        sm:px-4 
        rounded-2xl 
        transition-all 
        ${isWeatherOpen ? 'bg-white/20 shadow-inner' : 'hover:bg-white/10'}
    `,

    taskbarContentTop: `
        flex 
        items-center 
        gap-2 
        font-bold 
        text-xs 
        sm:text-sm
    `,

    taskbarContentBot: `
        text-[8px] 
        sm:text-[9px] 
        opacity-50 
        font-black 
        uppercase 
        tracking-widest 
        leading-none
    `,

    clockWrapper: `
        flex 
        items-center 
        gap-4 
        sm:gap-6 
        ${dark ? 'text-white' : 'text-gray-800'}
        relative
    `,

    popupWrapper: `
        absolute
        bottom-20
        right-0
        w-64
        ${dark ? 'bg-black/80 border-white/10' : 'bg-white/90 border-black/10'}
        backdrop-blur-3xl
        rounded-[2.5rem]
        p-7
        border
        shadow-2xl
        z-[999]
    `,
    
    popupInputWrapper: `
        relative 
        mb-6
    `,

    popupInputIcon: `
        absolute 
        left-3 
        top-3 
        text-white/30
    `,

    // popupInput:
    popupInput: `
        w-full 
        ${dark ? 'bg-white/10 border-white/10 text-white focus:bg-white/20' : 'bg-black/5 border-black/10 text-gray-800 focus:bg-black/10'}
        border 
        rounded-xl 
        py-2 
        pl-9 
        pr-3 
        outline-none 
        text-xs 
        transition-all
    `,

    suggestionList: `
        absolute
        top-full
        left-0
        right-0
        mt-1
        ${dark ? 'bg-black/90 border-white/10' : 'bg-white/95 border-black/10'}
        border
        rounded-xl
        overflow-hidden
        z-50
        shadow-lg
    `,

    suggestionItem: `
        px-3
        py-2
        text-xs
        cursor-pointer
        ${dark ? 'text-white/80 hover:bg-white/10' : 'text-gray-700 hover:bg-black/5'}
        transition-colors
    `,

    forcastWrapper: `
        space-y-4
    `,

    forcastColum: `
        flex 
        items-center 
        justify-between 
        text-[11px]
    `,

    forcastDate: `
        w-10 
        opacity-50 
        font-medium
    `,

    forcastTemp: `
        font-bold 
        w-8 
        text-right 
        tabular-nums
    `,
});

export const windowStyles = (dark) => ({
        wrapper: `
        absolute
        ${dark ? 'bg-white/80' : 'bg-black/80'}
        backdrop-blur-2xl
        rounded-[2.5rem]
        shadow-2xl
        border
        border-white/40
        overflow-hidden
    `,

    header: `
        flex 
        items-center 
        justify-between 
        px-6 
        py-4 
        cursor-grab 
        active:cursor-grabbing
    `,

    title: `
        text-[10px] 
        font-black 
        text-gray-500 
        uppercase 
        tracking-widest
    `,

    closeBtn: `
        p-2 
        hover:bg-black/5 
        rounded-full
    `,

    content: `
        p-4
        sm:p-8
        [@media(max-width:639px)]:max-h-[72vh]
        sm:max-h-[55vh]
        overflow-y-auto
        custom-scrollbar
        [font-family:'Comic_Sans_MS',cursive]
    `
});

export const loginStyles = (dark) => ({
    wrapper: `
        fixed
        inset-0
        z-[999]
        flex
        flex-col
        items-center
        justify-center
        gap-6
        overflow-y-auto
    `,

    clockWrapper: `
        absolute
        top-12
        flex
        flex-col
        items-center
        select-none
        [@media(max-height:500px)]:hidden
    `,

    clockMain: `
        text-white/90 
        font-light 
        tabular-nums
    `,

    clockWeekday: `
        text-white/40 
        text-sm mt-1
    `,

    formWrapper: `
        flex 
        flex-col 
        items-center 
        gap-3
    `,

    userPfp: `
        w-20 
        h-20 
        rounded-full 
        flex 
        items-center 
        justify-center 
        text-white/50 
        mb-2
    `,

    userPicture: `
        mt-1
    `,

    inputUsername: `
        rounded-lg 
        px-4 
        py-2 
        text-sm 
        text-white 
        outline-none 
        w-52 
        text-center
    `,

    inputPassword: `
        rounded-lg 
        px-4 
        py-2 
        text-sm 
        text-white 
        outline-none 
        w-52 
        text-center 
        tracking-widest 
        placeholder:tracking-normal
    `,

    inputIncorrect: `
        text-red-400 
        text-xs
    `,

    submitLogin: `
        mt-1 
        px-8 
        py-2 
        rounded-lg 
        text-sm 
        font-medium 
        text-white 
        transition-all 
        hover:brightness-110 
        active:scale-95
    `
});

export const SettingsAppStyles = (dark) => ({

    darkModeToggleWrapper: `
        flex 
        items-center 
        justify-between
    `,

    darkModeToggleLabel: `
        text-[10px] 
        font-black 
        text-gray-400 
        uppercase 
        tracking-widest
    `,

    darkModeToggle: `
        flex 
        items-center 
        gap-2 
        px-3 
        py-1.5 
        rounded-xl 
        text-xs 
        font-bold
        transition-all 
        border

        ${dark ? 
        `   bg-black/20 
            border-black/20 
            text-gray-700`
        : 
        `   bg-white/20 
            border-white/20 
            text-gray-500
        `}
    `,

    brightnessLabel: `
        text-[10px] 
        font-black 
        text-gray-400 
        uppercase 
        tracking-widest 
        block 
        mb-2
    `,

    brightness: `
        w-full 
        accent-blue-600
    `
});

export const WikiAppStyles = (dark) => ({

    wrapper: `
        space-y-4
    `,

    searchbar: `
        w-full 
        ${dark ? 
        `   bg-black/5 
            border-black/5 
            text-gray-800 
            placeholder:text-gray-400 
            focus:bg-white`
        : 
        `   bg-white/10 
            border-white/10 
            text-white 
            placeholder:text-white/40 
            focus:bg-white/20
        `}
        rounded-xl 
        p-3 
        outline-none 
        border 
        transition-all 
        text-sm
    `,

    columWrapper: `
        p-2 
        border-b 
        ${dark ? 
            'border-black/5' 
        :   'border-white/10'
        }
        last:border-0
    `,

    columTextWrapper: `
        flex 
        justify-between 
        items-start 
        gap-2
    `,

    title: `
        font-bold 
        text-blue-400
        text-sm
    `,

    content: `
        text-xs 
        ${dark ? 
            'text-black/70' 
        :   'text-white/60'
        }
        leading-relaxed 
        line-clamp-3
    `,

    buttonWrapper: `
        shrink-0 
        flex 
        flex-col 
        items-center 
        justify-between 
        gap-4 
        self-stretch 
        pt-0.5
    `,

    speechAPIbutton: `
        ${dark ?
        `   text-black/40
            hover:text-black`
        :
        `   text-white/40
            hover:text-white
        `}
        transition-colors
        p-2
    `,

    redirectButton: `
        ${dark ?
        `   text-black/40
            hover:text-black`
        :
        `   text-white/40
            hover:text-white
        `}
        transition-colors
        p-2
    `,
});