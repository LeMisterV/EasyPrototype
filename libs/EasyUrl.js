(function (define, undef) {
    "use strict";

    define('EasyUrl', ['EasyPrototype'], function(EasyPrototype) {

        /**

        Composant d'origine :
            - href

        Composants brut :

            - protocol (avec : et en minuscule)
            - slashedProtocol (:// ou :)
            - auth (sans @ final)
            - hostname
            - port (sans :)
            - pathname (avec / initial)
            - search (avec ?)
            - hash (avec #)

        Composants complémentaires :
            - user
            - pass
            - host (hostname + port)
            - path (pathname + search)
            - query (search parsé en objet JS)

        */

        var properties = {
            protocol : true,
            slashedProtocol : true,
            auth : true,
            hostname : true,
            port : true,
            pathname : true,
            search : true,
            hash : true,

            user : false,
            pass : false,
            host : false,
            path : false,
            query : false
        };

        var EasyUrl = EasyPrototype.createClass('EasyUrl', {
            pattern_href : /^(?:([a-z]{1,6}\:)(\/\/)?)?(?:([^@]*?)@)?(.*?)(?::([^0-9]+))?(\/[^\?]*?)?(\?[^#]*?)?(#.*)?$/i,

            init : function init(href, relativeTo) {
                var key;

                if (relativeTo) {
                    if (!(relativeTo instanceof EasyUrl)) {
                        relativeTo = new EasyUrl(relativeTo);
                    }

                    this.base = relativeTo;
                }

                if (href) {
                    if (typeof href === 'string') {
                        this.href = href;
                        this.parse();
                    }
                    else {
                        for (key in href) {
                            if (key in properties) {
                                this[key] = href[key];
                            }
                        }
                        this.format();
                    }
                }
            },

            parse : function parse() {
                var hrefMatch = this.pattern_href.exec(this.href);
                var authColon;
                var pathnameArray;

                if (hrefMatch) {
                    this.protocol = hrefMatch[1];
                    this.slashedProtocol = this.protocol && !!hrefMatch[2];
                    this.auth = hrefMatch[3];
                    this.hostname = hrefMatch[4];
                    this.port = +hrefMatch[5] || undef;
                    this.pathname = hrefMatch[6];
                    this.search = hrefMatch[7];
                    this.hash = hrefMatch[8];

                    // Si base est défini et qu'il n'y a ni protocol ni auth ni port, on considère
                    // qu'on est avec une URL relative, et donc le hostname trouvé par la regExp
                    // correspond en fait au début du pathname relatif.
                    // Il faut donc reconstituer le pathname final et récupérer les éléments
                    // manquants depuis la base
                    if (this.base && !this.protocol && !this.auth && !this.port) {
                        if (this.pathname) {
                            this.hostname += this.pathname;
                        }
                        this.pathname = this.hostname;

                        this.protocol = this.base.protocol;
                        this.auth = this.base.auth;
                        this.hostname = this.base.hostname;
                        this.port = this.base.port;

                        if (this.base.pathname) {
                            pathnameArray = this.base.pathname.split('/');
                            pathnameArray.length--;
                            pathnameArray.push.apply(pathnameArray, this.pathname.split('/'));
                            this.pathname = pathnameArray.join('/');
                        }
                    }

                    if (this.hostname) {
                        this.host = this.hostname;
                        if (this.port) {
                            this.host += ':' + this.port;
                        }
                    }

                    if (this.pathname || this.search) {
                        this.path = this.pathname || '';

                        if (this.search) {
                            this.path += this.search;
                        }
                    }

                    if (this.auth) {
                        authColon = this.auth.indexOf(':');
                        if (authColon !== -1) {
                            this.user = this.auth.slice(0, authColon);
                            this.pass = this.auth.slice(authColon + 1);
                        }
                        else {
                            this.user = this.auth;
                        }
                    }

                    this.query = EasyUrl.parseSearch(this.search && this.search.slice(1));
                }
                else {
                    throw new Error('EasyUrl Parse Error on href : ' + this.href);
                }
            },

            format : function format() {
                this.href = this.toString();
            },

            toObject : function toObject(simple) {
                var object = {};
                var key;

                for (key in properties) {
                    if (!simple || properties[key]) {
                        object[key] = this[key];
                    }
                }

                return object;
            },

            toString : function toString() {
                var key, urlString = '', queryString = '';

                if (this.hostname || this.host) {
                    if (this.protocol) {
                        urlString += this.protocol;
                        if (this.slashedProtocol) {
                            urlString += '//';
                        }
                    }

                    if (this.auth) {
                        urlString += this.auth + '@';
                    }
                    else if (this.user) {
                        urlString += this.user;
                        if (this.pass) {
                            urlString += ':' + this.pass;
                        }
                        urlString += '@';
                    }

                    if (this.host) {
                        urlString += this.host;
                    }
                    else {
                        urlString += this.hostname;

                        if (this.port) {
                            urlString += ':' + this.port;
                        }
                    }
                }

                if (this.path) {
                    urlString += this.path;
                }
                else {
                    urlString += this.pathname || '';

                    if (this.query) {
                        urlString += EasyUrl.formatSearch(this.query);
                    }
                    else if (this.search) {
                        urlString += this.search;
                    }
                }

                urlString += this.hash || '';

                return urlString;
            },

            __statics__ : {
                parseSearch : function parseSearch(search) {
                    var query = {};
                    if (!search) {
                        return query;
                    }

                    var values = search.split('&');

                    var len = values.reverse().length;

                    while (len--) {
                        if (values[len]) {
                            values[len] = values[len].split('=');
                            if (values[len].length === 1) {
                                query[values[len][0]] = null;
                            }
                            else {
                                query[values[len][0]] = values[len].slice(1).join('=');
                            }
                        }
                    }

                    return query;
                },

                formatSearch : function formatSearch(query) {
                    var key;
                    var queryArray = [];

                    for (key in query) {
                        if (query[key] !== null) {
                            queryArray.push(key + '=' + query[key]);
                        }
                        else {
                            queryArray.push(key);
                        }
                    }

                    if (queryArray.length) {
                        return '?' + queryArray.join('&');
                    }
                    return '';
                }
            }
        });

        return EasyUrl;
    });
}(define));