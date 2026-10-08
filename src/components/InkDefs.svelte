<!-- Global SVG filters: slightly irregular, bleeding ink edges for kana on paper. -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <filter id="ink" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.035"
        numOctaves="3"
        seed="11"
        result="noise"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale="2.6"
        xChannelSelector="R"
        yChannelSelector="G"
        result="wobble"
      />
      <feGaussianBlur in="wobble" stdDeviation="0.35" result="soft" />
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.8"
        numOctaves="2"
        seed="4"
        result="grain"
      />
      <feColorMatrix
        in="grain"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.25"
        result="speckle"
      />
      <feComposite in="soft" in2="speckle" operator="in" />
    </filter>
  </defs>
</svg>
