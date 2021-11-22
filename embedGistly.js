(function() {
  /**
   * @typedef {Object} EmbedGistly__CallbackObject
   * @property {string} created_at
   * @property {string} description
   * @property {string} div
   * @property {Array<string>} files
   * @property {string} owner
   * @property {boolean} public
   * @property {string} stylesheet
   */
  
  /**
   * @typedef {Object} EmbedGistly__Options
   * @property {string=} file
   *   The file to be displayed as the main file.  This should refer to an HTML
   *   file or a Markdown file.  If not given defaults to one of the one of the
   *   following in this order:  "~gistly.md", "~index.md", "gistly.md",
   *   "index.md".  If none of those defaults are found then it looks either for
   *   the first file that ends in ".md" or just the first file.
   * @property {string=} placement
   */
  
  /**
   * 
   * @param {string} idOrUrl
   *   Either the ID of the GitHub Gist to embed or the URL.
   * @param {HTMLElement} placeholder
   *   The element whose contents will be overwritten with the Gistly contents.
   * @param {EmbedGistly__Options} options
   *   Any additional options for this Gistly.
   */
  function embedGistly(idOrUrl, placeholder, options) {
    options = Object(options);
    const placement = options.placement?.toLowerCase();
  
    // Get the normalized ID and URL.
    var callbackName = `_${Math.random()}${Math.random()}`.replace(/\./g, '');
    const gistId = idOrUrl.replace(/^https?:\/\/gist\.github\.com\/(?:[^/]+\/)?(\w+).*$/, '$1');
    const gistUrl = `https://gist.github.com/${gistId}`;
    const jsonpScript = el('script', {
      src: `${gistUrl}.json?callback=${callbackName}`
    });
  
    /**
     * @param {EmbedGistly__CallbackObject} gistObject 
     */
    window[callbackName] = gistObject => {
      (document.head || document.body).appendChild(el('link', {
        rel: 'stylesheet',
        href: gistObject.stylesheet,
        onload() {
          const filesByName = parseFiles(gistObject);
    
          const gistFileNames = gistObject.files;
          const displayFileName = options.file
            ?? ["~gistly.md", "~index.md", "gistly.md", "index.md"].find(
              displayFileName => gistFileNames.includes(displayFileName)
            )
            ?? gistFileNames.find(name => /\.md$/.test(name))
            ?? gistFileNames[0];

          // Add the new container to the DOM.
          const elemGist = placeNode(el('div', {className: 'gist'}), placeholder, placement);
          elemGist.appendChild(filesByName[displayFileName].elemGistFile);

          // Add nested embeds.
          'file,raw-file raw-css raw-html raw-js raw-javascript'.replace(/\S+/g, '[lang=embed-$&]')
          elemGist
            .querySelectorAll('file,raw-file,raw-css,raw-html,raw-js,raw-javascript'.replace(/[^,]+/g, '[lang=embed-$&]'))
            .forEach(elemEmbed => {
              const {parentNode} = elemEmbed;
              const embedName = elemEmbed.innerText.trim();
              let {elemGistData, code} = filesByName[embedName] ?? {};
              const lang = elemEmbed.getAttribute('lang');
              code ??= elemEmbed.innerText;
              if (lang === 'embed-file') {
                parentNode.insertBefore(elemGistData, elemEmbed);
                elemGistData.style.borderBottom = 'none';
              }
              else if (lang === 'embed-raw-css' || embedName.endsWith('.css')) {
                (document.head || document.body).appendChild(el('style', {
                  innerHTML: code
                }));
              }
              else if (lang === 'embed-raw-js' || lang === 'embed-raw-javascript' || embedName.endsWith('.js')) {
                eval(code);
              }
              else {
                parentNode.insertBefore(el('div', {innerHTML: code}), elemEmbed);
              }
              parentNode.removeChild(elemEmbed);
            });
        }
      }));
      document.body.removeChild(jsonpScript);
    };
  
    // Add the script which uses JSON-P to get the GitHub Gist.
    document.body.appendChild(jsonpScript);
  }

  function embedGistlies() {
    document.body.querySelectorAll('script[data-gistly]')
      .forEach(script => {
        if (script.getAttribute('data-gistly-handled')) return;
        script.setAttribute('data-gistly-handled', 'true');
        const gistId = script.getAttribute('data-gistly');
        const gistFile = script.getAttribute('data-file');
        embedGistly(gistId, script, { file: gistFile, placement: 'replace' });
      });
  }

  /**
   * @typedef {Object} ParseFiles__Object
   * @property {string} code
   * @property {string} name
   * @property {boolean} isRawHTML
   * @property {HTMLElement} elemGistFile
   * @property {HTMLElement} elemGistData
   * @property {HTMLElement} elemGistMeta
   */

  /**
   * @param {EmbedGistly__CallbackObject} gistObject
   * @returns {{[key: string]: ParseFiles__Object}}
   */
  function parseFiles(gistObject) {
    const parserDiv = el('div', { innerHTML: gistObject.div });
    const filesByName = {};
    Array.from(parserDiv.querySelectorAll('.gist-file'))
      .forEach(elemGistFile => {
        const elemGistMeta = elemGistFile.querySelector('.gist-meta');
        const fileName = elemGistMeta.querySelector('[href*="#file-"]').innerText.trim();
        const elemGistData = elemGistFile.querySelector('.gist-data');
        const isRawHTML = !!elemGistData.querySelector('.entry-content');
        const codeSource = isRawHTML ? 'innerHTML' : 'innerText';
        filesByName[fileName] = {
          code: elemGistFile.querySelector('.gist-data')[codeSource],
          name: fileName,
          isRawHTML,
          elemGistFile,
          elemGistData,
          elemGistMeta,
        };
      });
    return filesByName;
  }

  /**
   * @param {string} nodeName 
   * @param {*} attrs 
   * @returns {HTMLElement}
   */
  function el(nodeName, attrs) {
    const elem = document.createElement(nodeName);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'style') {
        Object.entries(value).forEach(([key, value]) => {
          elem.style[key] = value;
        });
      }
      else {
        elem[key] = value;
      }
    });
    return elem;
  }

  /**
   * @param {T} newNode
   * @param {HTMLElement} placeholder
   * @param {"before"|"after"|"replace"|"first"|"last"|"fill"} [placement="before"]
   * @returns {T}
   * @template T
   */
  function placeNode(newNode, placeholder, placement) {
    const {parentNode} = placeholder;
    if (placement === 'after') {
      parentNode.insertBefore(newNode, placeholder.nextSibling);
    }
    else if (placement === 'first') {
      placeholder.insertBefore(newNode, placeholder.firstChild);
    }
    else if (placement === 'last') {
      placeholder.insertBefore(newNode, null);
    }
    else if (placement === 'fill') {
      placeholder.innerHTML = '';
      placeholder.appendChild(newNode);
    }
    else { // before or replace
      parentNode.insertBefore(newNode, placeholder);
      if (placement === 'replace') {
        parentNode.removeChild(placeholder);
      }
    }
    return newNode;
  }

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    embedGistlies();
  }
  else {
    window.addEventListener('DOMContentLoaded', embedGistlies);
  }
})();
