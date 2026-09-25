import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionGallery } from './MotionGallery'
import '../src/motion/tokens.css'
import '../src/motion/presets.css'
import './motion-gallery.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><MotionGallery /></React.StrictMode>)
