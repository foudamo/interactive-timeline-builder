document.addEventListener('DOMContentLoaded', async () => {
  // --- Variables ---
  const timeline = getTimelineData();
  const container = document.getElementById('timeline-container');
  const slidesContainer = document.getElementById('slides-container');
  const tracker = document.getElementById('tracker-dot');
  const pathSvg = document.getElementById('timeline-path');
  const pathLine = document.getElementById('path-line');

  let currentIndex = 0;
  let layout = {};
  let fixedPositions = null;
  let isCentering = false;
  let currentTheme = null;

  // Load fixed positions from JSON
  async function loadFixedPositions() {
    // Skip fetch if running from file:// protocol to avoid CORS errors
    if (window.location.protocol === 'file:') {
      console.log('Running from file://, skipping positions.json fetch');
      return false;
    }
    
    try {
      const response = await fetch('positions.json');
      if (response.ok) {
        fixedPositions = await response.json();
        console.log('Loaded fixed positions:', fixedPositions);
        return true;
      }
    } catch (error) {
      console.warn('Could not load positions.json:', error);
    }
    return false;
  }

  // Load theme from JSON
  async function loadTheme() {
    // Skip fetch if running from file:// protocol to avoid CORS errors
    if (window.location.protocol === 'file:') {
      console.log('Running from file://, using default theme');
      currentTheme = getDefaultTheme();
      return true;
    }
    
    try {
      const response = await fetch('theme.json');
      if (response.ok) {
        const themeData = await response.json();
        const activeTheme = themeData.themes[themeData.currentTheme];
        if (activeTheme) {
          currentTheme = activeTheme;
          console.log('Loaded theme:', activeTheme.name);
          return true;
        }
      }
    } catch (error) {
      console.warn('Could not load theme.json:', error);
    }
    
    currentTheme = getDefaultTheme();
    return true;
  }

  function getDefaultTheme() {
    return {
      "name": "Cosmic Dark",
      "colors": {
        "background": "#111",
        "containerBackground": "transparent",
        "textPrimary": "#fff",
        "textSecondary": "rgba(255, 255, 255, 0.8)",
        "pathGradient": {
          "start": "#8A2BE2",
          "middle": "#1E90FF", 
          "end": "#FF69B4"
        },
        "milestones": [
          "#8A2BE2",
          "#1E90FF", 
          "#00CED1",
          "#9370DB",
          "#FF69B4"
        ],
        "activeMilestone": "#8A2BE2",
        "controls": {
          "background": "rgba(255, 255, 255, 0.1)",
          "border": "rgba(255, 255, 255, 0.2)",
          "hover": "rgba(255, 255, 255, 0.2)",
          "zoomOutBorder": "#8A2BE2",
          "zoomOutHover": "rgba(138, 43, 226, 0.15)"
        }
      },
      "effects": {
        "pathGlow": "drop-shadow(0 0 12px rgba(100, 100, 255, 0.5))",
        "milestoneGlow": "0 0 0 4px rgba(255, 255, 255, 0.3), 0 0 10px rgba(255, 255, 255, 0.5)",
        "activeMilestoneGlow": "0 0 0 6px rgba(138, 43, 226, 0.4), 0 0 20px rgba(138, 43, 226, 0.8)",
        "controlsBackdrop": "blur(10px)",
        "controlsShadow": "0 4px 30px rgba(0, 0, 0, 0.1)"
      },
      "dimensions": {
        "pathWidth": 20,
        "milestoneSize": 24,
        "activeMilestoneSize": 32,
        "controlSize": 60,
        "slideOpacity": 0.1,
        "slideActiveOpacity": 1
      }
    };
  }

  function applyTheme() {
    if (!currentTheme) return;
    
    // Apply theme to CSS custom properties
    const root = document.documentElement;
    const theme = currentTheme;
    
    // Set CSS custom properties for colors
    root.style.setProperty('--bg-color', theme.colors.background);
    root.style.setProperty('--container-bg', theme.colors.containerBackground);
    root.style.setProperty('--text-primary', theme.colors.textPrimary);
    root.style.setProperty('--text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--active-milestone-color', theme.colors.activeMilestone);
    root.style.setProperty('--controls-bg', theme.colors.controls.background);
    root.style.setProperty('--controls-border', theme.colors.controls.border);
    root.style.setProperty('--controls-hover', theme.colors.controls.hover);
    root.style.setProperty('--zoom-out-border', theme.colors.controls.zoomOutBorder);
    root.style.setProperty('--zoom-out-hover', theme.colors.controls.zoomOutHover);
    
    // Set CSS custom properties for effects
    root.style.setProperty('--path-glow', theme.effects.pathGlow);
    root.style.setProperty('--milestone-glow', theme.effects.milestoneGlow);
    root.style.setProperty('--active-milestone-glow', theme.effects.activeMilestoneGlow);
    root.style.setProperty('--controls-backdrop', theme.effects.controlsBackdrop);
    root.style.setProperty('--controls-shadow', theme.effects.controlsShadow);
    
    // Set CSS custom properties for dimensions
    root.style.setProperty('--path-width', theme.dimensions.pathWidth + 'px');
    root.style.setProperty('--milestone-size', theme.dimensions.milestoneSize + 'px');
    root.style.setProperty('--active-milestone-size', theme.dimensions.activeMilestoneSize + 'px');
    root.style.setProperty('--control-size', theme.dimensions.controlSize + 'px');
    root.style.setProperty('--slide-opacity', theme.dimensions.slideOpacity);
    root.style.setProperty('--slide-active-opacity', theme.dimensions.slideActiveOpacity);
    
    // Update gradient for path
    const gradient = pathSvg.querySelector('#timeline-gradient');
    if (gradient) {
      const stops = gradient.querySelectorAll('stop');
      if (stops.length >= 3) {
        stops[0].setAttribute('stop-color', theme.colors.pathGradient.start);
        stops[1].setAttribute('stop-color', theme.colors.pathGradient.middle);
        stops[2].setAttribute('stop-color', theme.colors.pathGradient.end);
      }
    }
    
    // Update milestone colors
    const milestones = document.querySelectorAll('.milestone');
    milestones.forEach((milestone, index) => {
      const colorIndex = index % theme.colors.milestones.length;
      milestone.style.backgroundColor = theme.colors.milestones[colorIndex];
    });
    
    console.log('Applied theme:', theme.name);
  }

  // --- Core Functions ---

  function calculateDimensions() {
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    pathSvg.setAttribute('viewBox', `0 0 ${containerWidth} ${containerHeight}`);
    return {
      width: containerWidth,
      height: containerHeight,
    };
  }

  function buildTimeline(pathDefinition, milestonePoints) {
    console.log('buildTimeline called with pathDefinition:', pathDefinition);
    console.log('pathLine element exists:', !!pathLine);
    
    if (!slidesContainer) return;
    slidesContainer.innerHTML = '';
    
    const dotsContainer = document.getElementById('milestones');
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';

    milestonePoints.forEach((point, index) => {
      const dot = document.createElement('div');
      dot.className = 'milestone';
      dot.style.left = `${point.x}px`;
      dot.style.top = `${point.y}px`;
      dot.dataset.index = index;
      dot.addEventListener('click', () => {
        currentIndex = index;
        updateTimelineView();
      });
      dotsContainer.appendChild(dot);
    });

    timeline.events.forEach((event, i) => {
      const slide = document.createElement('div');
      slide.className = 'slide';
      slide.dataset.index = i;
      slide.innerHTML = `<h2>${event.title}</h2><p>${event.content}</p>`;
      
      if (event.image) {
        const imgContainer = document.createElement('div');
        imgContainer.style.width = '100%';
        imgContainer.style.height = '120px';
        imgContainer.style.marginTop = '10px';
        imgContainer.style.overflow = 'hidden';
        imgContainer.style.display = 'flex';
        imgContainer.style.alignItems = 'center';
        imgContainer.style.justifyContent = 'center';
        imgContainer.style.position = 'relative';
        
        const img = new Image();
        img.alt = event.title;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '5px';
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.5s ease';
        
        img.onerror = () => {
          imgContainer.innerHTML = `<div style="padding: 10px; color: #ff6b6b; font-style: italic; text-align: center; border: 1px dashed #ff6b6b; border-radius: 5px; width: 100%;">Image not available</div>`;
        };
        img.onload = () => { img.style.opacity = '1'; };
        img.src = event.image;
        
        imgContainer.appendChild(img);
        slide.appendChild(imgContainer);
      }
      
      slide.addEventListener('click', () => {
        currentIndex = i;
        updateTimelineView();
      });
      slidesContainer.appendChild(slide);
    });
    
    console.log('Setting pathLine d attribute to:', pathDefinition);
    pathLine.setAttribute('d', pathDefinition);
    
    // Ensure path is visible with basic styling
    pathLine.style.stroke = '#8A2BE2';
    pathLine.style.strokeWidth = '20px';
    pathLine.style.fill = 'none';
    pathLine.style.strokeLinecap = 'round';
    pathLine.style.opacity = '1';
    
    // Debug: Log the SVG element state
    console.log('pathLine element:', pathLine);
    console.log('pathLine d attribute:', pathLine.getAttribute('d'));
    console.log('pathLine computed style stroke:', window.getComputedStyle(pathLine).stroke);
    console.log('pathLine computed style stroke-width:', window.getComputedStyle(pathLine).strokeWidth);
  }

  function renderSlides(slidePositions, connectorData) {
    const slideElements = document.querySelectorAll('.slide');
    slideElements.forEach((slide, index) => {
      if (slidePositions[index]) {
        slide.style.left = `${slidePositions[index].x}px`;
        slide.style.top = `${slidePositions[index].y}px`;
      }
    });

    document.querySelectorAll('.slide-connector').forEach(c => c.remove());
    connectorData.forEach(data => {
      const connector = document.createElement('div');
      connector.className = 'slide-connector';
      const { startPoint, angle, distance } = data;
      connector.style.position = 'absolute';
            connector.style.zIndex = '4';
      connector.style.backgroundColor = '#fff';
      connector.style.height = '2px';
      connector.style.pointerEvents = 'none';
      connector.style.width = `${distance}px`;
      connector.style.transformOrigin = '0 0';
      connector.style.transform = `translate(${startPoint.x}px, ${startPoint.y}px) rotate(${angle}rad)`;
      container.appendChild(connector);
    });
  }

  // --- UI Update Functions ---

  function highlightSlide(index) {
    document.querySelectorAll('.slide').forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
      // Restore default opacity logic: active slide fully opaque, others lower
      if (i === index) {
        // Start with low opacity and scaled down
        slide.style.opacity = '0.1';
        slide.style.transform = 'scale(0.8)';
        slide.style.transition = 'opacity 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55), transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        
        setTimeout(() => {
          slide.style.opacity = '1';
          slide.style.transform = 'scale(1)';
        }, 100); // Delay before elastic reveal
      } else {
        slide.style.opacity = '';
        slide.style.transform = '';
        slide.style.transition = '';
      }
    });
  }

  function animatePath() {
    if (!layout.milestonePoints) return;
    
    const totalLength = pathLine.getTotalLength();
    
    if (currentIndex === 0) {
      // At index 0, show no path
      pathLine.style.strokeDasharray = `0 ${totalLength}`;
      pathLine.style.strokeDashoffset = '0';
      pathLine.style.transition = 'stroke-dasharray 0.8s ease-in-out';
      return;
    }
    
    // Calculate precise progress to end exactly at the current dot
    const progress = currentIndex / (layout.milestonePoints.length - 1);
    const drawLength = totalLength * progress;
    
    // Set up the dash array to show only the drawn portion with smoother timing
    pathLine.style.strokeDasharray = `${drawLength} ${totalLength}`;
    pathLine.style.strokeDashoffset = '0';
    pathLine.style.transition = 'stroke-dasharray 1.0s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  }

    function highlightDot(index) {
    document.querySelectorAll('.milestone').forEach((dot, i) => {
      dot.classList.remove('active-marker');
      // Apply same opacity logic as slides
      if (i === index) {
        dot.style.opacity = '1';
      } else {
        dot.style.opacity = '0'; // Hide inactive dots completely
      }
    });
    const activeDot = document.querySelector(`.milestone[data-index='${index}']`);
    if (activeDot) activeDot.classList.add('active-marker');
  }

  function moveTracker(index) {
    if (layout.milestonePoints && layout.milestonePoints[index]) {
      const point = layout.milestonePoints[index];
      tracker.style.left = `${point.x}px`;
      tracker.style.top = `${point.y}px`;
    }
  }

  function updateTimelineView(duration = 1200) {
    // Check if centering is already in progress
    if (isCentering) {
      console.log('Timeline view update blocked - centering in progress');
      return;
    }
    
    // Start with dot and tracker movement (immediate)
    highlightDot(currentIndex);
    moveTracker(currentIndex);
    
    // Begin path animation (immediate)
    animatePath();
    
    // Center the viewport FIRST, then highlight slide
    centerViewportOnSlide(currentIndex, duration);
    
    // Delay slide highlighting to sync with zoom completion
    setTimeout(() => {
      highlightSlide(currentIndex);
    }, duration * 0.7);
  }

  function centerViewportOnSlide(slideIndex, duration = 1200) {
    // Prevent multiple simultaneous centering operations
    if (isCentering) {
      console.log('Centering already in progress, skipping...');
      return;
    }
    
    // Ensure we have valid layout data
    if (!layout || !layout.slidePositions || !layout.slidePositions[slideIndex]) {
      console.error(`No slide position data for index ${slideIndex}`);
      return;
    }
    
    isCentering = true;

    // Get the fixed position from positions.json (via layout)
    const slidePosition = layout.slidePositions[slideIndex];
    const milestonePosition = layout.milestonePoints[slideIndex];
    
    // Also check the actual DOM element positions
    const slideElement = document.querySelector(`.slide[data-index='${slideIndex}']`);
    const milestoneElement = document.querySelector(`.milestone[data-index='${slideIndex}']`);
    const slideActualX = slideElement ? parseInt(slideElement.style.left) : 'not found';
    const slideActualY = slideElement ? parseInt(slideElement.style.top) : 'not found';
    const dotActualX = milestoneElement ? parseInt(milestoneElement.style.left) : 'not found';
    const dotActualY = milestoneElement ? parseInt(milestoneElement.style.top) : 'not found';
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Dynamic slide dimensions based on screen size
    let slideWidth, slideHeight;
    
    // Detect screen characteristics - be more specific about mobile detection
    const screenAspectRatio = screenWidth / screenHeight;
    const isLandscape = screenWidth > screenHeight;
    const isLargeScreen = screenWidth >= 1024;
    const isMobile = screenWidth <= 900; // Increased threshold to catch more mobile devices
    
    // Set slide dimensions based on device type
    if (screenWidth <= 480 && !isLandscape) {
      // Mobile portrait - wider slides
      slideWidth = 160;
      slideHeight = 180;
    } else if (isMobile) {
      // Mobile landscape or small tablets
      slideWidth = 140;
      slideHeight = 170;
    } else {
      // Desktop
      slideWidth = 240;
      slideHeight = 200;
    }
    
    // Mobile-responsive positioning and scaling
    let scale, targetX, targetY;
    
    // Consistent left-edge positioning for all screen sizes
    targetY = screenHeight * 0.5; // Always center vertically
    
    if (isMobile) {
      if (isLandscape) {
        // Landscape mobile: normal zoom, close to left edge
        scale = 1.0;
        targetX = screenWidth * 0.15; // 15% from left edge
      } else {
        // Portrait mobile: increased zoom, close to left edge but with space for content
        scale = 1.2;
        targetX = screenWidth * 0.2; // 20% from left edge
      }
    } else {
      // Desktop: position dot close to left edge with higher zoom
      scale = 1.8;
      targetX = screenWidth * 0.15; // 15% from left edge (closer to edge)
    }
    
    console.log(`🎯 DEBUGGING RESPONSIVE DOT CENTERING for slide ${slideIndex}:`);
    console.log(`  📱 Screen: ${screenWidth}x${screenHeight} (${screenAspectRatio.toFixed(2)} aspect ratio)`);
    console.log(`  📐 Screen type: ${isLargeScreen ? 'Large' : isMobile ? 'Mobile' : 'Medium'}, ${isLandscape ? 'Landscape' : 'Portrait'}`);  
    console.log(`  📍 Milestone dot position: (${milestonePosition.x}, ${milestonePosition.y})`);
    console.log(`  🔍 Using scale: ${scale}x`);
    console.log(`  🎯 Target position in pixels: (${targetX}, ${targetY})`);
    
    // Convert target screen position to virtual coordinates
    const virtualTargetX = targetX / scale;
    const virtualTargetY = targetY / scale;
    
    console.log(`  🎯 Target in virtual coords: (${virtualTargetX}, ${virtualTargetY})`);
    
    // Calculate translation to put the DOT at target position
    const translateX = virtualTargetX - milestonePosition.x;
    const translateY = virtualTargetY - milestonePosition.y;
    
    console.log(`  🔧 Translation needed: (${translateX}, ${translateY})`);
    console.log(`  ✅ After transform, dot should be at virtual: (${milestonePosition.x + translateX}, ${milestonePosition.y + translateY})`);
    
    // Apply transform with smooth animation
    container.style.transitionDuration = `${duration}ms`;
    container.style.transitionTimingFunction = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    
    const roundedTranslateX = Math.round(translateX * 100) / 100;
    const roundedTranslateY = Math.round(translateY * 100) / 100;
    const roundedScale = Math.round(scale * 1000) / 1000;
    
    console.log(`  🔍 Scale: ${roundedScale}`);
    console.log(`  🔍 Translation: (${roundedTranslateX}, ${roundedTranslateY})`);
    console.log(`  ✅ Expected result: Dot should be at target position (${targetX}, ${targetY})`);
    
    const transformString = `scale3d(${roundedScale}, ${roundedScale}, 1) translate3d(${roundedTranslateX}px, ${roundedTranslateY}px, 0)`;
    container.style.transform = transformString;
    
    console.log(`  🎬 Applied transform: ${transformString}`);
    console.log(`  🔍 Container current transform: ${container.style.transform}`);
    
    // Release the centering lock after animation completes
    setTimeout(() => {
      isCentering = false;
    }, duration + 100);
  }

  // --- Initialization and Event Listeners ---

  function initializeTimeline() {
    if (!fixedPositions) {
      console.error('Fixed positions not loaded! Cannot initialize timeline.');
      return;
    }

    // USE FIXED POSITIONS DIRECTLY - No scaling based on screen size!
    // The viewport will transform to show these fixed positions correctly
    layout = {
      pathDefinition: fixedPositions.pathDefinition,
      milestonePoints: fixedPositions.milestonePoints,
      slidePositions: fixedPositions.slidePositions,
      connectorData: [] // No connectors needed with fixed positions
    };

    console.log('Initialized layout with FIXED positions (no scaling):');
    console.log('Virtual canvas:', fixedPositions.virtualCanvas);
    console.log('Milestones:', layout.milestonePoints.slice(0, 3)); // Show first 3
    console.log('Slides:', layout.slidePositions.slice(0, 3)); // Show first 3

    buildTimeline(layout.pathDefinition, layout.milestonePoints);
    renderSlides(layout.slidePositions, layout.connectorData);

    // Initialize path as hidden
    const totalLength = pathLine.getTotalLength();
    pathLine.style.strokeDasharray = `0 ${totalLength}`;
    pathLine.style.strokeDashoffset = '0';

    // Set initial view to be centered and scaled down
    updateTimelineView(0); // Initial focus with no animation
  }

  // Fallback positions (default 16:9 layout)
  function getDefaultPositions() {
    return {
      virtualCanvas: { width: 1920, height: 1080 },
      milestonePoints: [
        {"x": 192, "y": 378}, {"x": 384, "y": 702}, {"x": 576, "y": 378},
        {"x": 768, "y": 702}, {"x": 960, "y": 378}, {"x": 1152, "y": 702},
        {"x": 1344, "y": 378}, {"x": 1536, "y": 702}, {"x": 1728, "y": 378}
      ],
      slidePositions: [
        {"x": 72, "y": 278}, {"x": 264, "y": 602}, {"x": 456, "y": 278},
        {"x": 648, "y": 602}, {"x": 840, "y": 278}, {"x": 1032, "y": 602},
        {"x": 1224, "y": 278}, {"x": 1416, "y": 602}, {"x": 1608, "y": 278}
      ],
      pathDefinition: "M 192 378 C 256 378 320 702 384 702 C 448 702 512 378 576 378 C 640 378 704 702 768 702 C 832 702 896 378 960 378 C 1024 378 1088 702 1152 702 C 1216 702 1280 378 1344 378 C 1408 378 1472 702 1536 702 C 1600 702 1664 378 1728 378"
    };
  }

  // Initialize after loading positions and theme
  Promise.all([loadFixedPositions(), loadTheme()]).then(([positionsSuccess, themeSuccess]) => {
    if (!positionsSuccess) {
      console.warn('Failed to load positions.json - using default positions');
      fixedPositions = getDefaultPositions();
    }
    
    if (themeSuccess) {
      applyTheme();
    }
    
    initializeTimeline();
  });

  document.getElementById('next').addEventListener('click', () => {
    console.log(`Next button clicked. Current index before: ${currentIndex}, Total events: ${timeline.events.length}`);
    if (currentIndex < timeline.events.length - 1 && !isCentering) {
      currentIndex++;
      console.log(`Index incremented to: ${currentIndex}, about to call updateTimelineView()`);
      updateTimelineView();
    } else if (isCentering) {
      console.log('Next button blocked - centering in progress');
    } else {
      console.log('Already at last event');
    }
  });

  document.getElementById('prev').addEventListener('click', () => {
    if (currentIndex > 0 && !isCentering) {
      currentIndex--;
      updateTimelineView();
    } else if (isCentering) {
      console.log('Prev button blocked - centering in progress');
    }
  });

  // Debounced resize handler to prevent constant reinitializations
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Reinitialize with new screen dimensions to maintain 16:9 scaling
      if (fixedPositions) {
        console.log('Window resized, reinitializing timeline');
        initializeTimeline();
        updateTimelineView(0);
      }
    }, 150); // Wait 150ms after resize stops
  });

  // Zoom Out Button Logic
  document.getElementById('zoom-out').addEventListener('click', () => {
    zoomOutToFit();
  });

  function zoomOutToFit(duration = 800) {
    if (!fixedPositions) {
      console.error('Fixed positions not available for zoom out');
      return;
    }

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isMobile = screenWidth <= 900;
    
    // Calculate the actual bounding box for both mobile and desktop
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    // Include all milestone points
    layout.milestonePoints.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
    
    // Include all slide positions (with their dimensions)
    const isLandscape = screenWidth > screenHeight;
    let slideWidth, slideHeight;
    if (isMobile && screenWidth <= 480 && !isLandscape) {
      slideWidth = 160;
      slideHeight = 180;
    } else if (isMobile) {
      slideWidth = 140;
      slideHeight = 170;
    } else {
      slideWidth = 240;
      slideHeight = 200;
    }
    
    layout.slidePositions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + slideWidth);
      maxY = Math.max(maxY, pos.y + slideHeight);
    });
    
    // Add comfortable margin
    const margin = isMobile ? 50 : 150;
    minX -= margin;
    minY -= margin;
    maxX += margin;
    maxY += margin;
    
    // Calculate required scale to fit everything
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const scaleX = screenWidth / contentWidth;
    const scaleY = screenHeight / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up
    
    // Simple centering: put content center at screen center
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    const screenCenterX = screenWidth / 2;
    const screenCenterY = screenHeight / 2;
    
    // Transform: translate so content center appears at screen center
    const translateX = screenCenterX / scale - contentCenterX;
    const translateY = screenCenterY / scale - contentCenterY;
    
    console.log(`Zoom out: scale=${scale.toFixed(3)}, translate=(${translateX.toFixed(1)}, ${translateY.toFixed(1)})`);
    console.log(`Content bounds: ${contentWidth.toFixed(0)}x${contentHeight.toFixed(0)}, Screen: ${screenWidth}x${screenHeight}`);
    
    // Apply transform
    container.style.transitionDuration = `${duration}ms`;
    container.style.transitionTimingFunction = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    container.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale3d(${scale}, ${scale}, 1)`;
    
    
    // Show the full path in overview mode
    const totalLength = pathLine.getTotalLength();
    pathLine.style.strokeDasharray = `${totalLength} 0`;
    pathLine.style.strokeDashoffset = '0';
    pathLine.style.transition = 'stroke-dasharray 0.8s ease-in-out';
    
    // Set all slides to fully opaque when zoomed out
    document.querySelectorAll('.slide').forEach(slide => {
      slide.style.opacity = '1';
      slide.style.transform = '';
      slide.style.transition = '';
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      document.getElementById('next').click();
    }
    if (e.key === 'ArrowLeft') {
      document.getElementById('prev').click();
    }
  });

  console.log('Timeline initialized and event listeners attached.');
});
