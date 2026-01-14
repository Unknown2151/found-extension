<script>
    import { onMount, onDestroy } from "svelte";
    import { cyInstance } from "../../store/graphStore";
    import { drawMinimap, handleMinimapClick } from "./minimapUtils.js";

    let canvas;
    let cy;

    const unsub = cyInstance.subscribe(c => cy = c);

    let raf;

    function loop() {
        drawMinimap(cy, canvas);
        raf = requestAnimationFrame(loop);
    }

    function onClick(e) {
        if (!cy || !canvas) return;
        handleMinimapClick(cy, canvas, e);
    }

    onMount(() => {
        raf = requestAnimationFrame(loop);
    });

    onDestroy(() => {
        unsub();
        cancelAnimationFrame(raf);
    });
</script>

<canvas
        bind:this={canvas}
        width="200"
        height="140"
        on:click={onClick}
        style="
        position:fixed;
        right:18px;
        bottom:18px;
        border-radius:6px;
        background:rgba(0,0,0,0.45);
        z-index:22;
        cursor:pointer;
    "
></canvas>
