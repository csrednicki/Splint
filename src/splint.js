function Splint(config) {

    var Splint = {

        defaultConfig: {
            // co ile trzeba uaktualnic stan szyny
            updateSplintIntervalTimeout: 1000, //ms

            // selektor kontenera artykulu
            articleContainerSelector: '',

            // selektor prawej szpalty
            sidebarContainerSelector: '',

            // identyfikator nowej szyny np. 'moja_szyna'
            splintId: '',

            // identyfikator klasy nowej szyny np. 'moja_klasa'
            splintClassName: 'scrolled',

            // selektor elementu ktory ma byc scrollowany wewnatrz szyny
            scrollElementSelector: '',

            // gorny margines strony
            pageTopMargin: 0,

            // podstawowe marginesy elementow
            marginHeight: 20,

            // marginesy gorny i dolny zostana wykorzystane jako przestrzen dla szyny
            squashMargins: false,

            // wykorzystaj pozostala przestrzen, stosowac tylko do ostatniej szyny w kolumnie
            useAllRemainingSpace: false,

            // maksymalna wysokosc szyny, parametr nie wymagany
            staticSplintHeight: null,

            // zamiast opakowywac kontener w nowa szyne, uzyj istniejacego kontenera
            useExistingContainer: false,

            // czy wlaczyc dla szyny tryb debugowania w ktorym pokazywane sa logi
            debug: false
        },

        _marginPreviousNeighbour: 0,
        _marginNextNeighbour: 0,
        _splintMarginTop: 0,
        _splintMarginBottom: 0,
        _marginTop: 0,
        _marginBottom: 0,

        log: function() {
            if(this.config.debug === true) {
                console.log(this.config.splintId, arguments);
            }
        },

        init: function(userConfig) {

            // jezeli zostala przekazana konfiguracja
            if( typeof userConfig === 'object' ) {

                // rozszerz obiekt konfiguracji podstawowej o konfiguracje uzytkownika
                // i zapisz w nowym uwspolnionym obiekcie
                this.config = $.extend({}, this.defaultConfig, userConfig);

                // sprawdz czy mamy identyfikator szyny i element do plywania
                if(this.config.splintId !== '' && this.config.scrollElementSelector !== '') {

                    var $scrolledContainer = this.getScrolledElementContainer();

                    // jezeli zostal znaleziony element przeznaczony do plywania
                    if($scrolledContainer.length > 0) {

                        // utworzenie szyny dla scrollowanego elementu
                        this.createSplint();

                        // aktualizacja szyny, wyliczenie pozycji itp
                        this.updateSplint();

                        // inicjacja petli co ile aktualizowana jest szyna
                        this.initSplintInterval();

                        // inicjacja zdarzen na ktore ma reagowac szyna
                        this.initSplintEvents();

                    } else {
                        // nie znaleziono elementu ktory ma byc scrollowany
                        return false;
                    }
                } else {
                    // jezeli nie mamy identyfikatora szyny i elementu
                    // ktory ma byc scrollowany to konczymy, to wymagane parametry
                    return false;
                }
            } else {
                // jezeli nie mamy konfiguracji to oznacza ze nie zostaly
                // wskazane podstawowe wymagane elementy, konczymy
                return false;
            }
        },

        createSplint: function() {
            var $scrolledContainer = this.getScrolledElementContainer();

            // sprawdz czy mamy uzyc istniejacego elementu w kodzie html strony
            if(this.config.useExistingContainer !== true) {
                // jezeli nie ma elementu o takim identyfikatorze,
                // utworz obiekt szyny
                var $splintContainer = $('<div />').attr({
                    // wykorzystujemy dane przekazane przez uzytkownika
                    id: this.config.splintId,
                    class: this.config.splintClassName
                }).css({
                    'cssText': 'position: relative; margin: 0 !important'
                });

                // opakowanie mlyna kontenerem szyny
                $scrolledContainer.wrap( $splintContainer );
            }

            // kontener szyny musi miec ustawiony tryb pozycjonowania relative
            // nie jest istotne czy jest to nowy kontener szyny czy istniejacy
            var $splintContainer = this.getSplintContainer();
            $splintContainer.css('position', 'relative');
        },

        initSplintInterval: function() {
            this.updateSplintInterval = setInterval(function() {

                // aktualizacja szyny
                Splint.updateSplint();

            }, this.config.updateSplintIntervalTimeout);
        },

        updateSplint: function() {

            // sprawdz czy mamy zmiazdzyc marginesy pobliskich elementow
            if(this.config.squashMargins === true) {
                this.initSquashingMargins();
            }

            // aktualna wysokosc szyny
            var splintHeight = this.calculateSplintHeight();

            // ustaw wysokosc szyny
            this.setSplintHeight(splintHeight);

            // ustal metode jaka ma byc zastosowana w tym momencie do scrollowania elementu
            this.setScrollingMethod();
        },

        initSquashingMargins: function() {
            this.squashScrolledContainerMargins();
            this.squashSplintContainerMargins();
            this.squashPreviousContainerMargins();
            this.squashNextContainerMargins();
        },

        squashScrolledContainerMargins: function() {
            var $scrolledContainer = this.getScrolledElementContainer(),
                // pobierz wysokosc marginesow kontenera szyny
                scrolledContainerMarginTop = parseInt($scrolledContainer.css('margin-top')),
                scrolledContainerMarginBottom = parseInt($scrolledContainer.css('margin-bottom'));

            // jezeli marginesy scrollowanego kontenera sa wieksze niz 20
            if(scrolledContainerMarginTop > this.config.marginHeight || scrolledContainerMarginBottom > this.config.marginHeight) {

                // zapamietujemy oryginalne wartosci, przydadza sie pozniej przy wyliczasniu kontenera szyny
                this._marginTop = scrolledContainerMarginTop;
                this._marginBottom = scrolledContainerMarginBottom;

                // nadpisujemy istniejace marginesy
                $scrolledContainer.css({
                    // tip of the day: !important mozna przypisac tylko za pomoca cssText
                    'cssText': 'position: relative; margin: 0 !important'
                });
            }
        },

        squashSplintContainerMargins: function() {
            var $splintContainer = this.getSplintContainer(),
                // pobierz wysokosc marginesow kontenera szyny
               splintContainerMarginTop = parseInt($splintContainer.css('margin-top')),
               splintContainerMarginBottom = parseInt($splintContainer.css('margin-bottom'));

            // jezeli marginesy szyny kontenera sa wieksze niz 20
            if(splintContainerMarginTop > this.config.marginHeight || splintContainerMarginBottom > this.config.marginHeight) {

                // zapamietujemy oryginalne wartosci, przydadza sie pozniej przy wyliczasniu kontenera szyny
                this._splintMarginTop = splintContainerMarginTop;
                this._splintMarginBottom = splintContainerMarginBottom;

                // nadpisujemy istniejace marginesy
                $splintContainer.css({
                    // tip of the day: !important mozna przypisac tylko za pomoca cssText
                    'cssText': 'position: relative; margin: '+this.config.marginHeight+'px 0 !important'
                });
            }
        },

        squashPreviousContainerMargins: function() {
            var $splintContainer = this.getSplintContainer(),
                $splintPreviousNeighbour = $splintContainer.prev();

            // jezeli ma wartosc 0 znaczy ze nie byl modyfikowany
            if(this._marginPreviousNeighbour === 0) {

                // jezeli istnieje poprzedni element
                if($splintPreviousNeighbour.length > 0) {

                    // pobierz dolny margines poprzedzajacego sasiadujacego elementu
                    var marginPreviousNeighbour = parseInt($splintPreviousNeighbour.css('margin-bottom'));

                    // jezeli wysokosc marginesu jest wieksza od 0
                    if(marginPreviousNeighbour > this.config.marginHeight) {

                        // to zapisz to jako wlasciwosc
                        this._marginPreviousNeighbour = marginPreviousNeighbour;

                        // usun dolny margines z elementu
                        $splintPreviousNeighbour.css({
                            'cssText': 'margin: '+this.config.marginHeight+'px 0 !important'
                        });

                    }
                }
            }
        },

        squashNextContainerMargins: function() {
            var $splintContainer = this.getSplintContainer(),
                $splintNextNeighbour = $splintContainer.next();

            // jezeli ma wartosc wieksza niz 0 znaczy ze byl modyfikowany
            if(this._marginNextNeighbour === 0) {

                // jezeli istnieje poprzedni element
                if($splintNextNeighbour.length > 0) {

                    // marginesy nastepnego sasiadujacego elementu
                    var marginNextNeighbour = parseInt($splintNextNeighbour.css('margin-top'));

                    // jezeli wysokosc marginesu jest wieksza od 0
                    if(marginNextNeighbour > this.config.marginHeight) {
                        // to zapisz to jako wlasciwosc
                        this._marginNextNeighbour = marginNextNeighbour;

                        // usun gorny margines z elementu
                        $splintNextNeighbour.css({
                            'cssText': 'margin: '+this.config.marginHeight+'px 0 !important'
                            //'cssText': 'margin: 0 !important'
                        });
                    }
                }
            }
        },

        getSplintContainer: function() {
            var splintContainer = $('#'+this.config.splintId);

            return splintContainer;
        },

        getSplintHeight: function(withMargins) {
            // okresl wysokosc szyny, parametr withMargins okresla czy trzeba
            // doliczyc rowniez wysokosc marginesow
            var splintHeight = this.getSplintContainer().outerHeight(withMargins === true ? true : false);

            return splintHeight;
        },

        getScrolledElementWidth: function() {
            var itemWidth = this.getScrolledElementContainer().outerWidth();

            return itemWidth;
        },

        setScrolledElementWidth: function(width) {
            var $scrolledElement = this.getScrolledElementContainer();

            $scrolledElement.css('width', width);
        },

        getScrolledElementContainer: function() {
            var $itemContainer = $( this.config.scrollElementSelector ).last();

            return $itemContainer;
        },

        getScrolledElementHeight: function() {
            var scrolledElementHeight = this.getScrolledElementContainer().outerHeight();

            return scrolledElementHeight;
        },

        setSplintHeight: function(splintHeight) {
            var $splintContainer = this.getSplintContainer(),
                scrolledElementHeight = this.getScrolledElementHeight();

            $splintContainer.css({
                // ustaw minimalna wysokosc szyny na wysokosc scrollowanego elementu
                height: splintHeight > 0 ? splintHeight : scrolledElementHeight
            });
        },

        initSplintEvents: function() {
            $(window).resize(function() {
                Splint.updateSplint();
            });

            $(window).scroll(function() {
                Splint.updateSplint();
            });

            $(window).unload(function() {
                clearInterval(Splint.updateSplintInterval);
            });
        },

        getSidebarContainer: function() {
            var $sidebarContainer = $(this.config.sidebarContainerSelector);

            return $sidebarContainer;
        },

        getSidebarHeight: function() {
            var $sidebarContainer = this.getSidebarContainer(),
                sidebarHeight = $sidebarContainer.outerHeight() - this.getSplintHeight();

            return sidebarHeight;
        },

        getArticleContainer: function() {
            var $articleContainer = $(this.config.articleContainerSelector);

            return $articleContainer;
        },

        getArticleHeight: function() {
            var $articleContainer = this.getArticleContainer(),
                articleHeight = $articleContainer.outerHeight();

            return articleHeight;
        },

        calculateSplintHeight: function() {
            var articleHeight = this.getArticleHeight(), // obliczenie wysokosci artykulu
                sidebarHeight = this.getSidebarHeight(), // wysokosc calej prawej szpalty
                scrolledElementHeight = this.getScrolledElementHeight(), // wysokosc mlyna
                splintHeight = null,
                // wysokosc artykulu minus wysokosc prawej szpalty
                remainingSpace = articleHeight - sidebarHeight,
                // wysokosc szyny nie moze byc mniejsza niz wysokosc scrollowanego elementu
                allRemainingSpace = remainingSpace > scrolledElementHeight ? remainingSpace : scrolledElementHeight;

            // jezeli w konfiguracji podano statyczna wysokosc szyny
            if(this.config.staticSplintHeight !== null) {

                // ustaw statyczna wysokosc szyny
                splintHeight = this.config.staticSplintHeight;

            } else if(this.config.useAllRemainingSpace === true) {

                // uzyj prostego wyliczenia
                splintHeight = allRemainingSpace;

            } else if(this.config.squashMargins === true) {

                // jezeli w konfiguracji ustawiono usuwanie/miazdzenie marginesow
                // to dodaj margines gorny i dolny do wysokosci szyny
                splintHeight = this._marginPreviousNeighbour
                    + this._splintMarginTop
                    + this._marginTop
                    + scrolledElementHeight
                    + this._marginBottom
                    + this._splintMarginBottom
                    + this._marginNextNeighbour;

            } else {

                splintHeight = allRemainingSpace;

            }

            return splintHeight;
        },

        getPageTopMargin: function() {
            return this.config.pageTopMargin;
        },

        getStartPosition: function() {
            var $splintContainer = this.getSplintContainer(),
                pageTopMargin = this.getPageTopMargin();

            // pozycja szyny od gory strony minus czapeczka
            return $splintContainer.offset().top - pageTopMargin;
        },

        getStopPosition: function() {
            var splintTop = this.getStartPosition(),
                splintHeight = this.getSplintHeight(),
                scrolledElementHeight = this.getScrolledElementHeight();

            return splintTop + splintHeight - scrolledElementHeight;
        },

        setScrollingMethod: function() {
            var $scrolledElement = this.getScrolledElementContainer(), // kontener scrollowanego elementu
                scrolledElementWidth = this.getScrolledElementWidth(), // szerokosc scrollowanego elementu
                actualScrollPosition = $(window).scrollTop(), // aktualna pozycja scrolla
                startScrollPosition = this.getStartPosition(), // poczatkowa pozycja scrollowania
                stopScrollPosition = this.getStopPosition(), // koncowa pozycja scrollowania
                pageTopMargin = this.getPageTopMargin(),  // margines od gory strony (czapeczka)
                scrollingMethod = {};

            // musimy okreslic szerokosc elementu dla sytuacji w ktorej scrollowany element
            // wchodzi w tryb pozycji fixed, musi miec podane rozmiary
            this.setScrolledElementWidth(scrolledElementWidth);

            // pozycja przed rozpoczeciem scrollowania
            if (actualScrollPosition <= startScrollPosition) {

                scrollingMethod = {
                    position: 'absolute',
                    top: 0,
                    bottom: 'auto'
                };

            // w trakcie scrollowania
            } else if (actualScrollPosition >= startScrollPosition && actualScrollPosition <= stopScrollPosition) {

                scrollingMethod = {
                    position: 'fixed',
                    top: pageTopMargin + 'px',
                    bottom: 'auto'
                };

            // pozycja koncowa scrollowania
            } else {

                scrollingMethod = {
                    position: 'absolute',
                    top: 'auto',
                    bottom: 0
                };
            }

            // ustawienie aktualnej metody pozycjonowania dla scrollowanego elementu
            $scrolledElement.css(scrollingMethod);

        }
    };

    Splint.init(config);
}