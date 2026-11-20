---
layout: layouts/base.njk
title: Home
heading: Dylan Festa
intro: "[Short tagline placeholder — e.g., Independent Researcher]"
---
<div class="prose">

<div class="template-notice">
  <strong>[Template placeholder]</strong> Replace the paragraphs below in <code>src/index.md</code> with your own introduction.
</div>

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

<h2>Links &amp; Contact</h2>

<p>[Contact placeholder — e.g., email address or preferred channel]</p>

<ul class="social-links" role="list">
  {% for profile in site.social %}
    <li>
      <a href="{{ profile.url }}">{{ profile.name }}</a>
    </li>
  {% endfor %}
</ul>

</div>
