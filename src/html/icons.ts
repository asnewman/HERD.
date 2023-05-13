// https://heroicons.com/

export default {
  heart: (opts?: {
    fill?: string;
    strokeColor?: string;
    strokeWidth?: string;
  }) => {
    return `
      <svg 
        stroke=${opts?.strokeColor || "currentColor"} 
        stroke-width=${opts?.strokeWidth || "1.5"}
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        class="w-6 h-6"
      >
        <path 
          ${opts?.fill ? `fill="${opts.fill}"` : ""}
          stroke-linecap="round" 
          stroke-linejoin="round" 
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" 
        />
      </svg>
  `;
  },
  bolt: (opts?: {
    fill?: string;
    strokeColor?: string;
    strokeWidth?: string;
  }) => {
    return `
    <svg 
      stroke=${opts?.strokeColor || "currentColor"} 
      stroke-width=${opts?.strokeWidth || "1.5"}
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      class="w-6 h-6"
    >
      <path 
        ${opts?.fill ? `fill="${opts.fill}"` : ""}
        stroke-linecap="round" 
        stroke-linejoin="round" 
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" 
      />
    </svg>
  `;
  },
  rocketLaunch: (opts?: {
    fill?: string;
    strokeColor?: string;
    strokeWidth?: string;
  }) => {
    return `
    <svg 
      stroke=${opts?.strokeColor || "currentColor"} 
      stroke-width=${opts?.strokeWidth || "1.5"}
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      class="w-6 h-6"
    >
    <path 
        ${opts?.fill ? `fill="${opts.fill}"` : ""}
    stroke-linecap="round" 
    stroke-linejoin="round" 
    d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" 
    />
    </svg>
  `;
  },
};
