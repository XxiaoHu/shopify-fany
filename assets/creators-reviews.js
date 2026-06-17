new Swiper('.review-swiper', {
    slidesPerView: 1,
    spaceBetween: 10,
    breakpoints: {
    320: { slidesPerView: 1, spaceBetween: 10 },
    375: { slidesPerView: 1.2, spaceBetween: 10 },
    768: { slidesPerView: 2, spaceBetween: 10 },
    1024: { slidesPerView: 2.5, spaceBetween: 10 },  
    1440: { slidesPerView: 4, spaceBetween: 20 }
    },
    navigation: {
        nextEl: '.slider-button--next',
        prevEl: '.slider-button--prev',
    }
});