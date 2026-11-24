# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js, React, Tailwind CSS, shadcn/ui, and ReactBits. Hosted on a new Vercel project. GitHub Pages at https://lelekhoa1812.github.io/My-Profile redirects to that Vercel app.

## Users

Employers and C-level readers. They open the portfolio to judge Dang Khoa Le (Liam), then ask the chatbot about his work.

## Product Purpose

The site presents Liam's public record and answers questions from that record. Success means a reader can check a claim quickly, and the chatbot refuses anything the record does not support.

## Positioning

The chatbot answers only from Liam's indexed record. It names the gap when the record is silent. It does not invent scope, rank, or metrics.

## Operating Context

Readers arrive from a link, GitHub, LinkedIn, or Hugging Face. They scan the pages, drag the chat button, and ask about roles, projects, and skills. The record includes the resume, public GitHub, public Hugging Face, and the Axion work named by the resume.

## Capabilities and Constraints

- Show the facts that are already in the resume, including the contact details in that resume.
- The server uses NVIDIA_NIM_API_KEY_1 through NVIDIA_NIM_API_KEY_9. It rotates and load-balances those keys. The browser never receives a key.
- MongoDB holds profile facts, sections, sessions, and tool traces. The connection string stays in MONGODB_URI.
- Axion copy covers two projects. One is the ERP comparison of FoodFlow and Axis. The other is automation for startup outreach, investor work, and portfolio reporting. Keep that copy short.
- When the old HTML and the resume disagree, show the resume dates and employers. Mark a portfolio-only claim as unverified.
- GitHub Pages redirects to the Vercel app after the new app is live.

## Brand Commitments

The person's name is Dang Khoa Le. He also uses Liam. Public profiles: GitHub Lelekhoa1812, Hugging Face khoaliamle, LinkedIn dang-khoa-le-96a6332a8.

## Evidence on Hand

- Resume: ~/Downloads/personal/LiamCV.pdf
- Current pages: index.html, experience.html, academic.html, and img/
- Local notes under research_notes/ are working material. They are not the public site.

## Product Principles

- The resume outranks the old HTML when dates or employers conflict.
- A claim needs a source the reader could check.
- Answers stay short. The point comes first.
- The chat control is an icon. The panel stays small.
- Secrets stay out of the browser, the git history, and the model prompt.
