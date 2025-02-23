document.addEventListener('DOMContentLoaded', function() {
    const queryForm = document.getElementById('queryForm');
    const submitBtn = document.getElementById('submitBtn');
    const spinner = submitBtn.querySelector('.spinner-border');
    const responseContainer = document.getElementById('responseContainer');
    const response = document.getElementById('response');
    const errorContainer = document.getElementById('errorContainer');
    const error = document.getElementById('error');
    const confidenceContainer = document.getElementById('confidenceContainer');
    const confidenceBar = document.getElementById('confidenceBar');
    const confidenceText = document.getElementById('confidenceText');
    const modelConfidences = document.getElementById('modelConfidences');
    const loading = document.getElementById('loading');

    function setLoading(isLoading) {
        if (isLoading) {
            spinner.classList.remove('d-none');
            submitBtn.disabled = true;
            loading.classList.remove('d-none');
        } else {
            spinner.classList.add('d-none');
            submitBtn.disabled = false;
            loading.classList.add('d-none');
        }
    }

    queryForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const query = document.getElementById('query').value.trim();
        const mode = document.getElementById('mode').value;

        if (!query) {
            showError('Please enter a query');
            return;
        }

        setLoading(true);
        hideAllContainers();

        try {
            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query, mode })
            });

            const data = await response.json();
            
            if (data.source === 'error') {
                showError(data.response.replace(/### Error\n\n\* /g, ''));
                return;
            }

            showResponse(data);
            updateConfidence(data.confidence);

        } catch (error) {
            console.error('Error:', error);
            showError('An error occurred while processing your request');
        } finally {
            setLoading(false);
        }
    });

    function hideAllContainers() {
        responseContainer.classList.add('d-none');
        errorContainer.classList.add('d-none');
    }

    function showError(message) {
        errorContainer.classList.remove('d-none');
        error.textContent = message;
    }

    function showResponse(data) {
        responseContainer.classList.remove('d-none');
        
        // Format the response based on mode
        let formattedResponse = data.response;
        let responseHtml = '';

        // Add mode-specific styling and formatting
        if (data.mode === 'math') {
            responseHtml = `
                <div class="card mb-3">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">Mathematical Solution</h5>
                    </div>
                    <div class="card-body">
                        ${formatContent(formattedResponse)}
                    </div>
                </div>`;
        } else if (data.mode === 'brainstorm') {
            responseHtml = formatBrainstormContent(formattedResponse);
        } else if (data.mode === 'code') {
            responseHtml = formatCodeContent(formattedResponse);
        } else {
            responseHtml = `
                <div class="card mb-3">
                    <div class="card-header bg-secondary text-white">
                        <h5 class="mb-0">Answer</h5>
                    </div>
                    <div class="card-body">
                        ${formatContent(formattedResponse)}
                    </div>
                </div>`;
        }

        // Add confidence information
        responseHtml += `
            <div class="card">
                <div class="card-header bg-dark text-white">
                    <h6 class="mb-0">AI Model Confidences</h6>
                </div>
                <div class="card-body">
                    ${formatModelConfidences(data.model_confidences)}
                </div>
            </div>`;

        response.innerHTML = responseHtml;
    }

    function formatContent(content) {
        // Remove markdown headers
        content = content.replace(/### .*?\n/g, '');
        
        // Format bullet points into a clean list
        const points = content.split('*').filter(point => point.trim());
        return `
            <ul class="list-group list-group-flush">
                ${points.map(point => `
                    <li class="list-group-item">
                        ${point.trim()}
                    </li>
                `).join('')}
            </ul>`;
    }

    function formatBrainstormContent(content) {
        // Remove markdown headers
        content = content.replace(/### .*?\n/g, '');
        
        // Format bullet points into enhanced idea cards
        const points = content.split('*').filter(point => point.trim());
        
        return `
            <div class="brainstorm-header mb-4">
                <div class="d-flex justify-content-between align-items-center">
                    <h4 class="mb-0">
                        <i class="bi bi-stars"></i> Creative Ideas
                        <span class="badge bg-primary ms-2">${points.length} ideas</span>
                    </h4>
                    <div class="brainstorm-controls">
                        <button class="btn btn-sm btn-outline-primary me-2" onclick="toggleView('grid')">
                            <i class="bi bi-grid"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="toggleView('list')">
                            <i class="bi bi-list-ul"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div class="brainstorm-container" id="ideasContainer">
                ${points.map((point, index) => {
                    const hue = (index * 60) % 360;
                    const bgColor = `hsl(${hue}, 70%, 90%)`;
                    const borderColor = `hsl(${hue}, 70%, 80%)`;
                    const tags = generateTags(point);
                    const category = getIdeaCategory(point);
                    
                    return `
                        <div class="brainstorm-card" style="--delay: ${index * 0.1}s">
                            <div class="idea-card" style="background-color: ${bgColor}; border-color: ${borderColor}">
                                <div class="idea-category">
                                    <span class="category-badge" style="background-color: ${getCategoryColor(category)}">
                                        ${category}
                                    </span>
                                </div>
                                
                                <div class="idea-number">
                                    <span>${index + 1}</span>
                                </div>

                                <div class="idea-content">
                                    <p>${formatIdeaText(point.trim())}</p>
                                </div>

                                <div class="idea-tags">
                                    ${tags.map(tag => `
                                        <span class="idea-tag">#${tag}</span>
                                    `).join('')}
                                </div>

                                <div class="idea-actions">
                                    <button class="btn btn-sm btn-light" onclick="copyIdea(${index})">
                                        <i class="bi bi-clipboard"></i>
                                    </button>
                                    <button class="btn btn-sm btn-light" onclick="likeIdea(${index})">
                                        <i class="bi bi-heart"></i>
                                        <span class="like-count">0</span>
                                    </button>
                                    <button class="btn btn-sm btn-light" onclick="expandIdea(${index})">
                                        <i class="bi bi-arrows-angle-expand"></i>
                                    </button>
                                </div>

                                <div class="idea-icon">
                                    ${getIdeaIcon(index)}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="brainstorm-footer mt-4">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="idea-stats">
                        <span class="me-3">
                            <i class="bi bi-lightbulb"></i> Total Ideas: ${points.length}
                        </span>
                        <span>
                            <i class="bi bi-tags"></i> Categories: ${getUniqueCategories(points).length}
                        </span>
                    </div>
                    <button class="btn btn-primary" onclick="generateMore()">
                        <i class="bi bi-plus-circle"></i> Generate More
                    </button>
                </div>
            </div>
        `;
    }

    function formatIdeaText(text) {
        // Bold text between ** **
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Highlight key phrases
        text = text.replace(/:(.*?):/g, '<span class="highlight">$1</span>');
        return text;
    }

    function getIdeaIcon(index) {
        const icons = [
            '<i class="bi bi-lightbulb"></i>',
            '<i class="bi bi-stars"></i>',
            '<i class="bi bi-rocket"></i>',
            '<i class="bi bi-puzzle"></i>',
            '<i class="bi bi-gem"></i>',
            '<i class="bi bi-magic"></i>'
        ];
        return icons[index % icons.length];
    }

    function formatModelConfidences(confidences) {
        if (!confidences || !confidences.length) return '';

        return `
            <div class="row">
                ${confidences.map(mc => `
                    <div class="col-12 mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span>${mc.model}</span>
                            <span class="badge ${getConfidenceBadgeClass(mc.confidence)}">
                                ${(mc.confidence * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar ${getConfidenceClass(mc.confidence)}" 
                                 role="progressbar" 
                                 style="width: ${mc.confidence * 100}%" 
                                 aria-valuenow="${mc.confidence * 100}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
    }

    function getConfidenceClass(confidence) {
        const percent = confidence * 100;
        if (percent >= 80) return 'bg-success';
        if (percent >= 50) return 'bg-warning';
        return 'bg-danger';
    }

    function getConfidenceBadgeClass(confidence) {
        const percent = confidence * 100;
        if (percent >= 80) return 'bg-success';
        if (percent >= 50) return 'bg-warning';
        return 'bg-danger';
    }

    function updateConfidence(confidence) {
        const confidencePercent = confidence * 100;
        confidenceBar.style.width = `${confidencePercent}%`;
        confidenceBar.setAttribute('aria-valuenow', confidencePercent);
        
        if (confidencePercent >= 80) {
            confidenceBar.className = 'progress-bar bg-success';
        } else if (confidencePercent >= 50) {
            confidenceBar.className = 'progress-bar bg-warning';
        } else {
            confidenceBar.className = 'progress-bar bg-danger';
        }
        
        confidenceText.textContent = `Confidence: ${confidencePercent.toFixed(1)}%`;
    }

    function generateTags(idea) {
        // Extract key words for tags
        const words = idea.toLowerCase().split(' ');
        const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
        return words
            .filter(word => word.length > 3 && !commonWords.has(word))
            .slice(0, 3)
            .map(word => word.replace(/[^a-z]/g, ''));
    }

    function getIdeaCategory(idea) {
        // Simple category detection based on content
        if (idea.toLowerCase().includes('technology')) return 'Tech';
        if (idea.toLowerCase().includes('business')) return 'Business';
        if (idea.toLowerCase().includes('creative')) return 'Creative';
        if (idea.toLowerCase().includes('science')) return 'Science';
        return 'General';
    }

    function getCategoryColor(category) {
        const colors = {
            'Tech': '#007bff',
            'Business': '#28a745',
            'Creative': '#fd7e14',
            'Science': '#17a2b8',
            'General': '#6c757d'
        };
        return colors[category] || colors['General'];
    }

    // Add these functions to window scope for onclick handlers
    window.toggleView = function(type) {
        const container = document.getElementById('ideasContainer');
        if (type === 'list') {
            container.classList.add('list-view');
        } else {
            container.classList.remove('list-view');
        }
    };

    window.copyIdea = function(index) {
        const idea = document.querySelectorAll('.idea-content p')[index].textContent;
        navigator.clipboard.writeText(idea);
        showToast('Idea copied to clipboard!');
    };

    window.likeIdea = function(index) {
        const likeBtn = document.querySelectorAll('.like-count')[index];
        let likes = parseInt(likeBtn.textContent);
        likeBtn.textContent = likes + 1;
        likeBtn.parentElement.classList.add('liked');
    };

    window.expandIdea = function(index) {
        const idea = document.querySelectorAll('.idea-card')[index];
        idea.classList.toggle('expanded');
    };

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function generateMore() {
        // Implementation of generateMore function
    }

    function getUniqueCategories(ideas) {
        const categories = [];
        ideas.forEach(idea => {
            const category = getIdeaCategory(idea);
            if (!categories.includes(category)) {
                categories.push(category);
            }
        });
        return categories;
    }

    function formatCodeContent(content) {
        // Remove markdown headers
        content = content.replace(/### .*?\n/g, '');
        
        // Split into explanation and code sections
        const sections = content.split('```');
        let explanation = sections[0].replace(/\*/g, '').trim();
        let codeBlock = sections.length > 1 ? sections[1] : '';
        
        // Detect language if specified
        let language = 'plaintext';
        if (codeBlock.startsWith('python')) {
            language = 'python';
            codeBlock = codeBlock.replace('python', '');
        } else if (codeBlock.startsWith('javascript')) {
            language = 'javascript';
            codeBlock = codeBlock.replace('javascript', '');
        }
        
        return `
            <div class="code-editor-container">
                <div class="editor-toolbar">
                    <div class="toolbar-left">
                        <div class="window-controls">
                            <span class="control close"></span>
                            <span class="control minimize"></span>
                            <span class="control maximize"></span>
                        </div>
                        <span class="file-name">code.${language}</span>
                    </div>
                    <div class="toolbar-right">
                        <select class="language-selector" onchange="changeLanguage(this.value)">
                            <option value="python" ${language === 'python' ? 'selected' : ''}>Python</option>
                            <option value="javascript" ${language === 'javascript' ? 'selected' : ''}>JavaScript</option>
                            <option value="plaintext" ${language === 'plaintext' ? 'selected' : ''}>Plain Text</option>
                        </select>
                        <button class="btn btn-sm btn-dark" onclick="copyCode()">
                            <i class="bi bi-clipboard"></i> Copy
                        </button>
                    </div>
                </div>
                
                <div class="editor-content">
                    <div class="line-numbers">
                        ${generateLineNumbers(codeBlock)}
                    </div>
                    <pre class="code-block"><code class="language-${language}">${codeBlock.trim()}</code></pre>
                </div>

                <div class="explanation-panel">
                    <div class="panel-header">
                        <i class="bi bi-info-circle"></i> Explanation
                    </div>
                    <div class="panel-content">
                        ${formatExplanation(explanation)}
                    </div>
                </div>

                <div class="editor-footer">
                    <div class="footer-left">
                        <span class="language-indicator">${language}</span>
                        <span class="file-info">${countLines(codeBlock)} lines</span>
                    </div>
                    <div class="footer-right">
                        <button class="btn btn-sm btn-outline-light" onclick="toggleTheme()">
                            <i class="bi bi-moon"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-light" onclick="toggleExplanation()">
                            <i class="bi bi-layout-text-sidebar"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function generateLineNumbers(code) {
        const lines = code.trim().split('\n');
        return lines.map((_, i) => `<span class="line-number">${i + 1}</span>`).join('');
    }

    function countLines(code) {
        return code.trim().split('\n').length;
    }

    function formatExplanation(text) {
        return text.split('\n')
            .filter(line => line.trim())
            .map(line => `<p>${line.trim()}</p>`)
            .join('');
    }

    // Add these to window scope for onclick handlers
    window.copyCode = function() {
        const code = document.querySelector('.code-block').textContent;
        navigator.clipboard.writeText(code);
        showToast('Code copied to clipboard!');
    };

    window.toggleTheme = function() {
        const editor = document.querySelector('.code-editor-container');
        editor.classList.toggle('light-theme');
    };

    window.toggleExplanation = function() {
        const panel = document.querySelector('.explanation-panel');
        panel.classList.toggle('collapsed');
    };

    window.changeLanguage = function(lang) {
        const codeBlock = document.querySelector('.code-block code');
        codeBlock.className = `language-${lang}`;
        document.querySelector('.language-indicator').textContent = lang;
        document.querySelector('.file-name').textContent = `code.${lang}`;
    };
});