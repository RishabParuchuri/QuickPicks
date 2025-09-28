// Mobile viewport utility to prevent keyboard resizing
export const initMobileViewport = () => {
  // Only run on mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) return;

  let isInputFocused = false;

  // Lock viewport only when input is focused
  const lockViewport = () => {
    document.body.classList.add('input-focused');
  };

  // Unlock viewport when input loses focus
  const unlockViewport = () => {
    document.body.classList.remove('input-focused');
  };

  // Prevent scroll when input is focused
  document.addEventListener('focusin', (e) => {
    if (e.target.matches('input, textarea, select')) {
      isInputFocused = true;
      lockViewport();
      
      // Prevent scroll to input on iOS
      setTimeout(() => {
        if (isInputFocused) {
          window.scrollTo(0, 0);
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;
        }
      }, 100);
    }
  });

  document.addEventListener('focusout', (e) => {
    if (e.target.matches('input, textarea, select')) {
      isInputFocused = false;
      // Delay unlock to prevent flashing
      setTimeout(() => {
        if (!isInputFocused) {
          unlockViewport();
        }
      }, 100);
    }
  });

  // Handle viewport changes only when input is focused
  const handleViewportChange = () => {
    if (isInputFocused) {
      lockViewport();
    }
  };

  // Handle resize events
  window.addEventListener('resize', handleViewportChange);

  // Handle orientation changes
  window.addEventListener('orientationchange', () => {
    setTimeout(handleViewportChange, 500);
  });

  // If visual viewport API is available, use it
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (isInputFocused) {
        lockViewport();
      }
    });
  }
};
