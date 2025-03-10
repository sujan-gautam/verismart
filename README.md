# VeriSmart

## Overview

**VeriSmart** is a Python-based AI Response Verification System designed to enhance the accuracy of AI-generated answers. By leveraging multiple AI models, VeriSmart cross-verifies responses to ensure consistency and reliability before presenting them to users.

## Features

- **Multi-AI Model Verification**: Utilizes multiple AI models to cross-verify responses.
- **Stepwise Validation Process**: Systematically filters and validates AI-generated answers.
- **Uncertainty Handling**: Provides informative messages when consensus isn't reached among models.
- **Scalable Architecture**: Easily extendable to incorporate additional AI models or verification steps.
- **User-Friendly Interface**: Simple and intuitive UI for seamless user interaction.

## Project Workflow

1. **User Input**: The user submits a query through the interface.
2. **Backend Processing**:
   - **Step 1**: Generate a response using the primary AI model.
   - **Step 2**: Generate a response using a secondary AI model.
   - **Step 3**: Compare the responses from both models.
   - **Step 4**: If responses match, present the answer to the user.
   - **Step 5**: If responses differ, generate a third response using an additional AI model.
   - **Step 6**: Determine the most consistent response among the three.
   - **Step 7**: If a consensus is reached (at least two matching responses), display the agreed-upon answer.
   - **Step 8**: If all responses differ, inform the user of the uncertainty.
3. **Response Display**: The validated response is shown to the user.

## Technology Stack

- **Backend**:
  - Python
  - Flask
  - Integration with AI APIs (e.g., OpenAI, Hugging Face)
- **Frontend**:
  - HTML/CSS
  - JavaScript
  - Flask-Integrated Templating (Jinja2)

## Installation & Setup

### Prerequisites

- Python 3.x
- pip (Python package installer)

### Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/sujan-gautam/verismart.git
   cd verismart
