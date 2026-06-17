new Swiper('.image-carousel-swiper', {
    slidesPerView: 4,
    spaceBetween: 20,
    navigation: {
        nextEl: '.slider-button--next',
        prevEl: '.slider-button--prev',
    },
    // 响应式配置
    breakpoints: {
        320: { slidesPerView: 1, spaceBetween: 10 },
        375: { slidesPerView: 1.1, spaceBetween: 10 },
        1001: { slidesPerView: 2.5, spaceBetween: 10 },
        1024: { slidesPerView: 3, spaceBetween: 10 },
        1440: { slidesPerView: 4, spaceBetween: 20 }
    }
});

document.querySelectorAll('.image-carousel-card').forEach(card => {
    card.addEventListener('click', () => {
        if(!card.dataset.id){
            return;
        }
        // 显示模态框
        const modalOverlay = document.getElementById(card.dataset.id);
        modalOverlay.style.display = 'flex';
        document.body.classList.add("overflow-hidden");

        modalOverlay.querySelector(".modal-close").addEventListener('click', () => {
            modalOverlay.style.display = 'none';
            document.body.classList.remove("overflow-hidden");
        });

        // 点击遮罩层空白处关闭模态框（可选增强体验）
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                document.body.classList.remove("overflow-hidden");
                modalOverlay.style.display = 'none';
            }
        });
    });
});
