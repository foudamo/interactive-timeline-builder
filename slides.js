document.addEventListener('DOMContentLoaded', () => {
  // --- Variables ---
  const timeline = getTimelineData();
  const container = document.getElementById('timeline-container');
  const slidesContainer = document.getElementById('slides-container');
  const tracker = document.getElementById('tracker-dot');
  const pathSvg = document.getElementById('timeline-path');
  const pathLine = document.getElementById('path-line');

  let currentIndex = 0;
  let layout = {};

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
    
    pathLine.setAttribute('d', pathDefinition);
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
        slide.style.opacity = '1';
      } else {
        slide.style.opacity = '';
      }
    });
  }

  function animatePath() {
    // Animation disabled
  }

    function highlightDot(index) {
    document.querySelectorAll('.milestone').forEach(dot => dot.classList.remove('active-marker'));
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
    highlightSlide(currentIndex);
    highlightDot(currentIndex);
    moveTracker(currentIndex);

    const point = layout.milestonePoints[currentIndex];
    const slidePosition = layout.slidePositions[currentIndex];

    // Safety check: If point or slide position is missing, abort.
    if (!point || !slidePosition) {
      console.error(`Layout data missing for index ${currentIndex}. Aborting zoom.`);
      // Reset to a default, centered, scaled-down view if data is missing
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const scaleX = screenWidth / 1920;
      const scaleY = screenHeight / 1080;
      const scale = Math.min(scaleX, scaleY);
      const translateX = (screenWidth - 1920 * scale) / (2 * scale);
      const translateY = (screenHeight - 1080 * scale) / (2 * scale);
      container.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
      return;
    }

    // --- Dynamic Zoom Calculation for Fixed Canvas ---
    const slideWidth = 140; // Standard slide width
    const slideHeight = 200; // Standard slide height
    const dotRadius = 15;
        const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isLandscape = screenWidth > screenHeight;
    const screenPadding = isLandscape ? 0.4 : 0.2; // Zoom in more in landscape

    // 1. Calculate the bounding box of the focused event (dot + slide) in the virtual canvas
    const bboxX1 = Math.min(point.x - dotRadius, slidePosition.x);
    const bboxY1 = Math.min(point.y - dotRadius, slidePosition.y);
    const bboxX2 = Math.max(point.x + dotRadius, slidePosition.x + slideWidth);
    const bboxY2 = Math.max(point.y + dotRadius, slidePosition.y + slideHeight);

    const bbox = {
      x: bboxX1,
      y: bboxY1,
      width: bboxX2 - bboxX1,
      height: bboxY2 - bboxY1,
    };

    // 2. Calculate the scale required to make the bounding box fit the viewport
    const scaleX = screenWidth * (1 - screenPadding) / bbox.width;
    const scaleY = screenHeight * (1 - screenPadding) / bbox.height;
    const scale = Math.min(scaleX, scaleY);

    // 3. Calculate the translation needed to center the scaled bounding box in the viewport
    const bboxCenterX = bbox.x + bbox.width / 2;
    const bboxCenterY = bbox.y + bbox.height / 2;

    // Formula: translate = (screen_center / scale) - bbox_center
    const translateX = (screenWidth / 2) / scale - bboxCenterX;
    // Adjust vertical center in landscape to move the view up
    const verticalCenter = isLandscape ? screenHeight * 0.45 : screenHeight / 2;
    const translateY = verticalCenter / scale - bboxCenterY;

    // 4. Apply the new transform
    container.style.transitionDuration = `${duration}ms`;
    container.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
  }

  // --- Initialization and Event Listeners ---

  function initializeTimeline() {
    const virtualWidth = 1920;
    const virtualHeight = 1080;
    const slideWidth = 140; // Standard slide width
    const slideHeight = 200; // Standard slide height

    // Always use the landscape layout logic with fixed dimensions
    layout = calculateLayout(timeline.events.length, virtualWidth, virtualHeight, slideWidth, slideHeight, false);

    buildTimeline(layout.pathDefinition, layout.milestonePoints);
    renderSlides(layout.slidePositions, layout.connectorData);

    // Set initial view to be centered and scaled down
    updateTimelineView(0); // Initial focus with no animation
  }

  initializeTimeline();

  document.getElementById('next').addEventListener('click', () => {
    if (currentIndex < timeline.events.length - 1) {
      currentIndex++;
      updateTimelineView();
    }
  });

  document.getElementById('prev').addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateTimelineView();
    }
  });

  window.addEventListener('resize', () => {
    initializeTimeline(); // Re-initialize on resize
  });

  // Zoom Out Button Logic
  document.getElementById('zoom-out').addEventListener('click', () => {
    zoomOutToFit();
  });

  function zoomOutToFit(duration = 800) {
    // Calculate the true bounding box of all slides and milestones
    const margin = 240;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    // Include all milestones
    layout.milestonePoints.forEach(point => {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    });
    // Include all slides (with their width/height)
    const slideWidth = 140; // Should match actual slide width
    const slideHeight = 200; // Should match actual slide height
    layout.slidePositions.forEach(pos => {
      if (pos.x < minX) minX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.x + slideWidth > maxX) maxX = pos.x + slideWidth;
      if (pos.y + slideHeight > maxY) maxY = pos.y + slideHeight;
    });
    minX -= margin; minY -= margin; maxX += margin; maxY += margin;
    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const scaleX = screenWidth / bboxWidth;
    const scaleY = screenHeight / bboxHeight;
    const scale = Math.min(scaleX, scaleY);
    // Center the bounding box in the viewport
    const bboxCenterX = minX + bboxWidth / 2;
    const bboxCenterY = minY + bboxHeight / 2;
    const screenCenterX = screenWidth / 2;
    const screenCenterY = screenHeight / 2;
    const translateX = (screenCenterX / scale) - bboxCenterX;
    const translateY = (screenCenterY / scale) - bboxCenterY;
    container.style.transitionDuration = `${duration}ms`;
    container.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    // Set all slides to fully opaque when zoomed out
    document.querySelectorAll('.slide').forEach(slide => {
      slide.style.opacity = '1';
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
