function viewOnScroll(renderIn, renderOut, identifier) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.remove(renderOut);
                entry.target.classList.add(renderIn);
            }
        });
    });

    const hiddenElements = document.querySelectorAll(identifier);
    hiddenElements.forEach((el) => observer.observe(el));
}

viewOnScroll('flyInRight', 'disappear', '.transformRight');
viewOnScroll('flyInLeft', 'disappear', '.transformLeft');
viewOnScroll('fadeIn', 'disappear', '.FadeIn');