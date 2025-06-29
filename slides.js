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
    document.querySelectorAll('.slide').forEach(slide => slide.classList.remove('active'));
    const activeSlide = document.querySelector(`.slide[data-index='${index}']`);
    if (activeSlide) activeSlide.classList.add('active');
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
      container.style.transform = 'scale(1) translate(0px, 0px)';
      return;
    }

    // --- Dynamic Zoom Calculation ---
    const slideWidth = 140; // These should ideally come from a shared config
    const slideHeight = 200;
    const dotRadius = 15;
    const screenPadding = 0.60; // Use 60% of the screen as padding

    // 1. Calculate the bounding box that contains the dot and the slide
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

    // 2. Calculate the scale required to make the bounding box fit the screen
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const scaleX = screenWidth * (1 - screenPadding) / bbox.width;
    const scaleY = screenHeight * (1 - screenPadding) / bbox.height;
    const scale = Math.min(scaleX, scaleY);

    // 3. Calculate the translation needed to center the scaled bounding box
    const bboxCenterX = bbox.x + bbox.width / 2;
    const bboxCenterY = bbox.y + bbox.height / 2;
    const translateX = (screenWidth / 2) / scale - bboxCenterX;
    const translateY = (screenHeight / 2) / scale - bboxCenterY;

    // 4. Apply the new transform
    container.style.transitionDuration = `${duration}ms`;
    container.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
  }

  // --- Initialization and Event Listeners ---

  function initializeTimeline() {
    const dimensions = calculateDimensions();
    layout = calculateLayout(timeline.events.length, dimensions.width, dimensions.height);

    buildTimeline(layout.pathDefinition, layout.milestonePoints);
    renderSlides(layout.slidePositions, layout.connectorData);

    updateTimelineView(0); // No animation for initial focus
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

  window.addEventListener('resize', initializeTimeline);

  console.log('Timeline initialized and event listeners attached.');
});
