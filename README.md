# Mathex

**Mathex** is a powerful, digital mathematics notebook built for students, researchers, and enthusiasts. It combines the flexibility of a block-based text editor with the computational power of **GNU Octave**, the creativity of an infinite **Chalkboard**, and the intelligence of an **AI Math Assistant**—all wrapped in a modern, customizable Electron interface.

Think of it as a math-focused Notion meets MATLAB.

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Build](https://img.shields.io/badge/build-passing-brightgreen.svg) ![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

---

## 🚀 Key Features

### 📝 Smart Block-Based Notebook
Organize your work using a flexible grid system with specialized blocks:
* **Math Blocks**: Write complex equations effortlessly using **LaTeX** (powered by MathLive) with a virtual keyboard.
* **Graph Blocks**: Visualize **Cartesian**, **Parametric**, and **Polar** functions instantly using the interactive `Mafs` engine.
* **Text & Media**: Mix markdown notes, images, and diagrams alongside your math.

### 💻 Integrated GNU Octave Terminal
A full-fledged MATLAB-compatible environment right inside your notebook:
* **Script Editor**: Write, save (`.m`), and run scripts with syntax highlighting and line numbers.
* **Interactive Console**: Execute commands directly with history support (Up/Down arrows).
* **Plotting Engine**: Generate 2D/3D plots that appear in **floating windows** or **docked panels**. Supports saving and copying plots directly to the clipboard.

### 🎨 Infinite Chalkboard
A dedicated space for freehand thinking and sketching:
* **Realistic Tools**: Use a **Ruler** for straight lines, a **Compass** for perfect circles, and a **Felt Eraser**.
* **Infinite Canvas**: Pan and zoom freely to map out large ideas.
* **Customization**: Switch between "Slate Green" and "Obsidian Black" board themes and use various chalk colors.

### 🤖 Math Buddy (AI Assistant)
An embedded AI chatbot to help you solve problems:
* **Context Aware**: Upload files or paste code for the AI to analyze.
* **LaTeX Support**: The AI responds with properly formatted math equations.
* **Floating Window**: Draggable and resizable interface so it never gets in your way.

### 🧰 Essential Utilities
* **Scientific Calculator**: A draggable popup calculator supporting Trigonometry (Deg/Rad), Logarithms, and standard operations.
* **Command Bar**: Access any tool or setting instantly using `Ctrl+Shift+P` (powered by `kbar`).
* **File Management**: Organize notes into notebooks and folders via a dedicated sidebar.

### 🎨 Customization & Accessibility
* **Theming**: Toggle between **Light/Dark** modes and choose from accents like Blue, Pink, Yellow, Purple, Red, and Green.
* **Localization**: Native support for **English** and **Hindi**, with RTL layout support.

---

## 🛠️ Tech Stack

Mathex is built with modern web technologies on top of Electron:

* **Core**: [Electron](https://www.electronjs.org/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
* **Styling**: [SCSS](https://sass-lang.com/)
* **Math & Graphing**: [MathLive](https://cortexjs.io/mathlive/), [Mafs](https://mafs.dev/), [Math.js](https://mathjs.org/)
* **Computation**: [GNU Octave](https://www.gnu.org/software/octave/) integration
* **Build Tools**: [Electron Forge](https://www.electronforge.io/), [Webpack](https://webpack.js.org/)

---

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/mathex.git](https://github.com/your-username/mathex.git)
    cd mathex
    ```

2.  **Install dependencies**
    ```bash
    yarn install
    # or
    npm install
    ```

3.  **Run the development server**
    ```bash
    yarn start
    # or
    npm start
    ```

4.  **Build for production**
    ```bash
    yarn make
    ```

> **Note**: To use the Octave Terminal features, you must have **GNU Octave** installed on your system and added to your system's PATH.

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and create a pull request for any features, bug fixes, or documentation improvements.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## Author Details
Samarjit Patar
patarsamar123abc@gmail.com