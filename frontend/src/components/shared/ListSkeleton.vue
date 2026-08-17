<template>
  <div class="box-placeholder">
    <div class="p-4">
      <span class="category text link"></span>
      <h4 class="text line"></h4>
      <h4 class="text"></h4>
    </div>
    <hr>
    <div class="image">
      <div class="embed-responsive embed-responsive-16by9"></div>
    </div>
    <hr>
    <div class="excerpt p-4">
      <div class="text line"></div>
      <div class="text line"></div>
      <div class="text"></div>
    </div>
    <hr>
    <div class="excerpt p-4">
      <div class="text line"></div>
      <div class="text line"></div>
      <div class="text"></div>
    </div>
  </div>
</template>

<style scoped>
.box-placeholder {
  display: inline-block;
  background-color: var(--contact-list);
  margin: 30px;
  box-shadow: 0 2px 3px 0 rgba(0, 0, 0, 0.1);
  max-width: 300px;
  vertical-align: top;
  font-size: 0;
  line-height: 0;
}
.box-placeholder hr {
  margin: 0;
  border-color: #f3f3f3;
}
.box-placeholder .text {
  display: inline-block;
  background-color: #444;
  height: 12px;
  border-radius: 100px;
  margin: 5px 0;
  min-width: 100px;
  opacity: 0.1;
  animation: fading 1.5s infinite;
}
.box-placeholder .text:first-child {
  margin-top: 0;
}
.box-placeholder .text:last-child {
  margin-bottom: 0;
}
.box-placeholder .text.link {
  opacity: 0.4;
}
.box-placeholder .text.line {
  width: 100%;
}
.box-placeholder .text.category {
  width: 100px;
  margin-bottom: 10px;
}
.box-placeholder h4.text {
  height: 20px;
  margin: 3px 0;
  opacity: 0.2;
}
.box-placeholder .image {
  background-color: #f9f9f9;
}
@keyframes fading {
  0% {
    opacity: 0.1;
  }
  50% {
    opacity: 0.2;
  }
  100% {
    opacity: 0.1;
  }
}
</style>
