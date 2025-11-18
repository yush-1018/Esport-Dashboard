// Pure JavaScript app to fetch and display trending games
(function() {
    // State management
    let games = [];
    let loading = true;
    let error = null;
    let search = "";
    let page = 1;
    let hasMore = true;
    let isLoadingMore = false;
    let favorites = (() => {
        const saved = localStorage.getItem('gameFavorites');
        return saved ? JSON.parse(saved) : [];
    })();
    let mostPopularGameId = null;
    const API_KEY = 'c6ea97e599bf40d2b865a7bef250bc6c';

    // Helper function to save favorites to localStorage
    function saveFavorites() {
        localStorage.setItem('gameFavorites', JSON.stringify(favorites));
    }

    // Compute most popular game
    function computeMostPopular(gamesList) {
        if (!gamesList || gamesList.length === 0) return null;
        return gamesList.reduce((best, g) => {
            if (!best) return g;
            const a = (g.ratings_count || 0);
            const b = (best.ratings_count || 0);
            if (a > b) return g;
            if (a === b) {
                if ((g.rating || 0) > (best.rating || 0)) return g;
                return best;
            }
            return best;
        }, null);
    }

    // Load more games
    function loadMoreGames() {
        if (isLoadingMore || !hasMore || search) return;
        
        isLoadingMore = true;
        render(); // Show loading state
        const nextPage = page + 1;
        const API_URL = `https://api.rawg.io/api/games?key=${API_KEY}&page=${nextPage}&page_size=40`;
        
        fetch(API_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch games');
                }
                return response.json();
            })
            .then(data => {
                if (data.results && data.results.length > 0) {
                    const existingIds = new Set(games.map(g => g.id));
                    const newGames = data.results.filter(g => !existingIds.has(g.id));
                    games = [...games, ...newGames];
                    const winner = computeMostPopular(games);
                    if (winner) mostPopularGameId = winner.id;
                    hasMore = data.next !== null;
                    page = nextPage;
                } else {
                    hasMore = false;
                }
                isLoadingMore = false;
                render();
            })
            .catch(err => {
                console.error('Error loading more games:', err);
                isLoadingMore = false;
                render();
            });
    }

    // Toggle favorite
    function toggleFavorite(gameId) {
        if (favorites.includes(gameId)) {
            favorites = favorites.filter(id => id !== gameId);
        } else {
            favorites = [...favorites, gameId];
        }
        saveFavorites();
        render();
    }

    // Filter games based on search
    function getFilteredGames() {
        if (!search) return games;
        const searchLower = search.toLowerCase();
        return games.filter(game => {
            const nameMatch = game.name.toLowerCase().includes(searchLower);
            const genreMatch = game.genres && game.genres.some(genre => 
                genre.name.toLowerCase().includes(searchLower)
            );
            return nameMatch || genreMatch;
        });
    }

    // Group games by genre
    function groupGamesByGenre(gamesList) {
        const genreMap = {};
        gamesList.forEach(game => {
            if (game.genres && game.genres.length > 0) {
                game.genres.forEach(genre => {
                    if (!genreMap[genre.name]) {
                        genreMap[genre.name] = [];
                    }
                    if (!genreMap[genre.name].find(g => g.id === game.id)) {
                        genreMap[genre.name].push(game);
                    }
                });
            }
        });
        return genreMap;
    }

    // Create game card element
    function createGameCard(game) {
        const genres = game.genres && game.genres.length > 0 
            ? game.genres.slice(0, 2).map(g => g.name).join(' | ')
            : 'Game';
        const isFavorited = favorites.includes(game.id);
        const isWinner = game.id === mostPopularGameId;
        
        const card = document.createElement('div');
        card.className = `game-card ${isFavorited ? 'favorited' : ''} ${isWinner ? 'card-winner' : ''}`;
        if (isWinner) {
            card.id = 'winnerCard';
        }

        if (isWinner) {
            const winnerBadge = document.createElement('div');
            winnerBadge.className = 'winner-badge';
            winnerBadge.title = 'Winner — Most Popular';
            
            const crown = document.createElement('span');
            crown.className = 'winner-crown';
            crown.textContent = '👑';
            
            const label = document.createElement('span');
            label.className = 'winner-label';
            label.textContent = 'Winner';
            
            winnerBadge.appendChild(crown);
            winnerBadge.appendChild(label);
            card.appendChild(winnerBadge);
        }

        if (game.background_image) {
            const img = document.createElement('img');
            img.src = game.background_image;
            img.alt = game.name;
            img.className = 'game-image';
            card.appendChild(img);
        }

        const content = document.createElement('div');
        content.className = 'game-card-content';

        const name = document.createElement('div');
        name.className = 'game-name';
        name.textContent = game.name;
        content.appendChild(name);

        const rating = document.createElement('div');
        rating.className = 'game-rating';
        
        const star = document.createElement('span');
        star.className = 'game-rating-star';
        star.textContent = '⭐';
        rating.appendChild(star);
        
        const ratingValue = document.createElement('span');
        ratingValue.textContent = game.rating ? game.rating.toFixed(2) : 'N/A';
        rating.appendChild(ratingValue);
        content.appendChild(rating);

        const tag = document.createElement('div');
        tag.className = 'game-tag';
        tag.textContent = genres;
        content.appendChild(tag);

        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = `favorite-btn ${isFavorited ? 'favorited' : ''}`;
        favoriteBtn.textContent = isFavorited ? '♥ Favorited' : '♡ Add to favorites';
        favoriteBtn.addEventListener('click', () => toggleFavorite(game.id));
        content.appendChild(favoriteBtn);

        card.appendChild(content);
        return card;
    }

    // Render the main app
    function render() {
        const appContainer = document.getElementById('app');
        if (!appContainer) return;

        // Check if search input had focus before clearing
        const oldSearchInput = appContainer.querySelector('.search-input');
        const hadFocus = oldSearchInput && document.activeElement === oldSearchInput;
        const cursorPosition = hadFocus ? oldSearchInput.selectionStart : null;

        // Clear existing content
        appContainer.innerHTML = '';

        if (loading) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading';
            loadingDiv.textContent = 'Loading games...';
            appContainer.appendChild(loadingDiv);
            return;
        }

        if (error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = error;
            appContainer.appendChild(errorDiv);
            return;
        }

        const filteredGames = getFilteredGames();
        const favoriteGames = favorites.map(id => games.find(g => g.id === id)).filter(Boolean);
        const genreGroups = search ? {} : groupGamesByGenre(games);
        const topGenres = Object.keys(genreGroups)
            .sort((a, b) => genreGroups[b].length - genreGroups[a].length)
            .slice(0, 5);

        // Search container
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'search-input';
        searchInput.placeholder = search ? '🔍 Search games...' : '🔍 Type to search games...';
        searchInput.value = search;
        searchInput.addEventListener('input', (e) => {
            search = e.target.value;
            render();
        });
        searchContainer.appendChild(searchInput);
        appContainer.appendChild(searchContainer);

        // Restore focus and cursor position if it had focus before
        if (hadFocus) {
            searchInput.focus();
            if (cursorPosition !== null && cursorPosition <= search.length) {
                searchInput.setSelectionRange(cursorPosition, cursorPosition);
            }
        }

        if (search) {
            // Search results
            const gameRow = document.createElement('div');
            gameRow.className = 'game-row';
            
            const rowTitle = document.createElement('h2');
            rowTitle.className = 'row-title';
            rowTitle.textContent = `Search Results (${filteredGames.length})`;
            gameRow.appendChild(rowTitle);
            
            const hScroll = document.createElement('div');
            hScroll.className = 'h-scroll';
            filteredGames.forEach(game => {
                hScroll.appendChild(createGameCard(game));
            });
            gameRow.appendChild(hScroll);
            appContainer.appendChild(gameRow);
        } else {
            // Favorites row
            if (favoriteGames.length > 0) {
                const favoritesRow = document.createElement('div');
                favoritesRow.id = 'favoritesRow';
                favoritesRow.className = 'game-row';
                
                const rowTitle = document.createElement('h2');
                rowTitle.className = 'row-title';
                rowTitle.textContent = '❤️ Your Favorites →';
                favoritesRow.appendChild(rowTitle);
                
                const hScroll = document.createElement('div');
                hScroll.className = 'h-scroll';
                favoriteGames.forEach(game => {
                    hScroll.appendChild(createGameCard(game));
                });
                favoritesRow.appendChild(hScroll);
                appContainer.appendChild(favoritesRow);
            }

            // Trending games row
            const trendingRow = document.createElement('div');
            trendingRow.id = 'trendingRow';
            trendingRow.className = 'game-row';
            
            const trendingTitle = document.createElement('h2');
            trendingTitle.className = 'row-title';
            trendingTitle.textContent = '🔥 Trending Games →';
            trendingRow.appendChild(trendingTitle);
            
            const trendingScroll = document.createElement('div');
            trendingScroll.className = 'h-scroll';
            games.slice(0, 40).forEach(game => {
                trendingScroll.appendChild(createGameCard(game));
            });
            trendingRow.appendChild(trendingScroll);
            appContainer.appendChild(trendingRow);

            // Genre rows
            topGenres.forEach(genreName => {
                const genreEmoji = genreName === 'Action' ? '⚔' : genreName === 'Adventure' ? '🎯' : genreName === 'RPG' ? '⚔' : genreName === 'Shooter' ? '🔫' : '🎮';
                
                const genreRow = document.createElement('div');
                genreRow.className = 'game-row';
                
                const genreTitle = document.createElement('h2');
                genreTitle.className = 'row-title';
                genreTitle.textContent = `${genreEmoji} ${genreName} →`;
                genreRow.appendChild(genreTitle);
                
                const genreScroll = document.createElement('div');
                genreScroll.className = 'h-scroll';
                genreGroups[genreName].forEach(game => {
                    genreScroll.appendChild(createGameCard(game));
                });
                genreRow.appendChild(genreScroll);
                appContainer.appendChild(genreRow);
            });

            // Load more button
            if (hasMore) {
                const loadMoreContainer = document.createElement('div');
                loadMoreContainer.className = 'load-more-container';
                
                if (isLoadingMore) {
                    const loadingMore = document.createElement('div');
                    loadingMore.className = 'loading-more';
                    loadingMore.textContent = 'Loading more games...';
                    loadMoreContainer.appendChild(loadingMore);
                } else {
                    const seeMoreBtn = document.createElement('button');
                    seeMoreBtn.className = 'see-more-btn';
                    seeMoreBtn.textContent = 'See More';
                    seeMoreBtn.addEventListener('click', loadMoreGames);
                    loadMoreContainer.appendChild(seeMoreBtn);
                }
                appContainer.appendChild(loadMoreContainer);
            }
        }
    }

    // Initial data fetch
    function fetchGames() {
        loading = true;
        render();
        const API_URL = `https://api.rawg.io/api/games?key=${API_KEY}&page=1&page_size=40`;
        
        fetch(API_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch games');
                }
                return response.json();
            })
            .then(data => {
                if (data.results && data.results.length > 0) {
                    games = data.results;
                    hasMore = data.next !== null;
                    const winner = computeMostPopular(games);
                    if (winner) mostPopularGameId = winner.id;
                    renderGenreChart(games);
                    renderRatingChart(games);
                }
                loading = false;
                render();
            })
            .catch(err => {
                console.error('Error fetching games:', err);
                error = 'Failed to load games. Please check your API key or use the proxy server.';
                loading = false;
                render();
            });
    }

    // Initialize app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            fetchGames();
        });
    } else {
        fetchGames();
    }
})();

// Menu handlers
function openMenu() {
    const nav = document.getElementById('sideNav');
    const btn = document.getElementById('hamburgerBtn');
    if (nav && btn) {
        nav.classList.add('open');
        nav.setAttribute('aria-hidden', 'false');
        btn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }
}

function closeMenu() {
    const nav = document.getElementById('sideNav');
    const btn = document.getElementById('hamburgerBtn');
    if (nav && btn) {
        nav.classList.remove('open');
        nav.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }
}

function navTo(e) {
    e.preventDefault();
    const target = e.target.dataset.target || e.target.closest('a')?.dataset.target;
    if (!target) return;
    
    const element = document.getElementById(target);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    closeMenu();
}

// Wire up menu handlers after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideClose = document.getElementById('sideClose');
    const menuLinks = document.querySelectorAll('.side-menu a');
    
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', openMenu);
    }
    
    if (sideClose) {
        sideClose.addEventListener('click', closeMenu);
    }
    
    menuLinks.forEach(link => {
        link.addEventListener('click', navTo);
    });
    
    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMenu();
        }
    });
    
    // Close menu when clicking overlay
    const sideNav = document.getElementById('sideNav');
    if (sideNav) {
        sideNav.addEventListener('click', (e) => {
            if (e.target === sideNav) {
                closeMenu();
            }
        });
    }
});
