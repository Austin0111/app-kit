import React from 'react'
import ReactDOM from 'react-dom/client'
import { ComponentGallery } from './ComponentGallery'
import '../src/motion/tokens.css'
import '../src/motion/presets.css'
import '../src/ui/components.css'
import './component-gallery.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ComponentGallery /></React.StrictMode>)
