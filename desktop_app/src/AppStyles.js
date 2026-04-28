/* TODO
    add more dark/ whitemode features
    border if settings

*/

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
        pointer-events-none         
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
        border-white/20 
        flex 
        items-center 
        justify-between 
        px-6 
        sm:px-10 
        z-200
    `,

    settingsButton: `
        w-11 
        h-11 
        rounded-2xl 
        overflow-hidden 
        hover:scale-110 
        transition-all 
        shadow-lg 
        active:scale-95
    `,

    wikiButton: `
        w-11 
        h-11 
        rounded-2xl 
        overflow-hidden 
        hover:scale-110 
        transition-all 
        shadow-lg 
        active:scale-95
    `,


});

export const weatherStyles = (dark, isWeatherOpen) => ({
    ClockWrapper: `
        flex 
        items-center 
        gap-4 
        sm:gap-6 
        text-white 
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


});

export const windowStyles = (dark) => ({
        wrapper: `
            absolute 
            w-[92vw] 
            sm:w-[400px] 
            ${dark ? 'bg-white/80 ' : 'bg-black/80 '}
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
            p-8 
            max-h-[55vh] 
            overflow-y-auto 
            custom-scrollbar
        `,
});