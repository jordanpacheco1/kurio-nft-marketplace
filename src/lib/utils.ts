import { createCn } from 'cn/config'

// Sem os tamanhos do tema, `text-caption` etc. contam como cor e o `text-*` de cor ao lado é descartado.
export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [{ text: ['micro', 'tiny', 'caption', 'body', 'tab', 'title', 'heading', 'logo', 'display'] }],
    },
  },
})
