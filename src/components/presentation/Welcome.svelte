<script lang="ts">
  // No script needed for this simple component
</script>

<div class="welcome-container">
  <h1 class="welcome-title">
    <span class="gradient-text">Hello, I am Deepthink</span>
  </h1>
</div>

<style>
  .welcome-container {
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 2rem;
    animation: fadeIn 1s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .welcome-title {
    font-size: 3rem;
    font-weight: 700;
    margin: 0;
  }

  .gradient-text {
    background: linear-gradient(45deg, var(--primary-color), #da70d6, #87ceeb);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-fill-color: transparent;
    animation: gradient-flow 5s ease infinite;
    background-size: 200% 200%;
  }

  @keyframes gradient-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @media (max-width: 768px) {
    .welcome-title {
      font-size: 2rem;
    }
  }
</style>