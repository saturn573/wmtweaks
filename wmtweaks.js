// ==UserScript==
// @name WMTweaks
// @description Tweaks for Heroes of war and money online game
// @version 1.0
// @grant GM_log
// @grant GM_addStyle
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_deleteValue
// @grant GM_setClipboard
// @run-at document-end
// @include http://*.heroeswm.ru*
// @include http://178.248.235.15/*

// @exclude	http://*.heroeswm.ru/quest_show_state.php*
// @exclude	http://178.248.235.15/quest_show_state.php*
// @exclude http://*.heroeswm.ru/quest_summary.php*
// @exclude	http://178.248.235.15/quest_summary.php*
// @exclude http://*heroeswm.ru/chat.php*
// @exclude http://*heroeswm.ru/ticker.html*
// @exclude http://*heroeswm.ru/chatonline.php*
// @exclude http://*heroeswm.ru/ch_box.php
// @exclude http://*heroeswm.ru/chat_line.php
// @exclude http://*heroeswm.ru/chatpost.php
// ==/UserScript==
/*Локальное хранилище*/
var storage = {    
    getValue: function (key) {
        if (key) {
            return GM_getValue(key);
        }
    },
    setValue: function (key, value) {
        if (key) {
            if (value) {
                GM_setValue(key, value);
            }
            else {
                GM_deleteValue(key);
            }
        }
    },
    getObject: function (key) {
        var valueStr = this.getValue(key);
        if (valueStr) {
            return JSON.parse(valueStr);
        }
    },
    setObject: function (key, value) {
        this.setValue(key, JSON.stringify(value));
    }
}

/*Настройки*/
var settings = {
    /*Отображать сообщения в консоли*/
    AllowLog: true,
    /*Использовать простую страницу входа*/
    UseSimpleStartPage: true,
    /*Использовать простое меню*/
    UseCustomMenu: true,
    /*Показывать таймеры гильдий в меню*/
    ShowTimersInMenu: true,
    /*Отображать текущую прочность одетых артефактов*/
    ShowItemsCurrentDurability: true,
    /*Скрывать карту*/
    HideMap: false,
    /*Заново считывает значения настроек из хранилища*/
    update: function () {
        var storedObj = storage.getObject(this.storageKey);
        if (storedObj) {
            for (var key in storedObj) {
                this[key] = storedObj[key];
            }
        }
    },
    /*Фиксирует изменения настроек*/
    store: function () {
        storage.setObject(this.storageKey, this);
    },
    storageKey: 'Settings'
};

/*Сохраненная персональная информация*/
var personalInfo = {
    /*Действет благословение Абу-Бекра*/
    PremiumEnabled: false,
    /*Последняя работа*/
    LastWork: {        
        /*Время в момент устройства*/
        Time: undefined,
        /*Час по серверу появления нового кода*/
        CodeHour: undefined,
        /*Код, набранный при попытке устроиться*/
        Code: undefined,
        /*Картинка*/
        Image: undefined,
        /*Ссылка для устройства*/
        Href: undefined,
        /*Идентфикатор объекта на котором производилось устройство*/
        ObjectId: undefined,
        /*Текст ответа*/
        ResponseText: undefined
    },
    Hunt: {
        /*Оставшееся до охоты время, мс*/
        Interval: undefined,
        /*Время начала ожидания, мс*/
        Time: undefined,
    },
    /*Время последней сдачи задания ГН*/
    LastMercenaryTime: undefined,
    /*Перечень наград в ГН*/
    MercenaryRewards: undefined,

    /*Информация о собственном персонаже*/
    PlayerInfo: {
        /*Ник*/
        Name: '',
        /*Боевой уровень*/
        Level: 0,
        /*Фракция*/
        Faction: 0,
        /*Класс*/
        Class: 0,
        /*Армия*/
        Army: undefined,
        /*Снаряжение*/
        Equipment: undefined,
        /*Навыки*/
        Skills: undefined,
    },
    /*Обновляет информацию, считывая ее заново из хранилища*/
    update: function () {
        var storedObj = storage.getObject(this.storageKey);
        if (storedObj) {
            for (var key in storedObj) {
                this[key] = storedObj[key];
            }
        }        
    },
    /*Очистка устаревших данных*/
    clear: function () {
        /*Очистка устаревших полей*/
        this.LastWorkTime = undefined;
        /*Очистка сведений о последней работе по истечении таймаута или смене часа*/
        var workInformation = { 
            lostTime: (getCurrentTime() - this.LastWork.Time) > guildTimeout.Worker,
            hourChanged: this.LastWork.CodeHour != commonInfo.getHour()            
        };
        if (workInformation.lostTime) {
            this.LastWork.Time = undefined;
            this.LastWork.CodeHour = undefined;
            this.LastWork.Image = undefined;
            this.LastWork.Code = undefined;
            this.LastWork.Href = undefined;
            this.LastWork.ObjectId = undefined;
            this.LastWork.ResponseText = undefined;            
        }
    },
    store: function () {
        storage.setObject(this.storageKey, this);
    },
    storageKey: 'personalInfo'
}

/*Сохраняемая информация об объекте
@constructor
@param {number} id Идентификатор объекта
*/
var ObjectInfo = function (id) {
    /*Идентификатор*/
    this.Id = id;
    /*Время полученной информации*/
    this.ActualTime = undefinedж
    /*Название*/
    this.Name = undefined;
    /*Сектор на карте мира*/
    this.SectorId = undefined;
    /*Баланс*/
    this.Balance = undefined;
    /*Количество занятых рабочих мест*/
    this.UseWorkPlaceCount = undefined;
    /*Количество свободных рабочих мест*/
    this.FreeWorkPlaceCount = undefined;
    /*Время окончания смены*/
    this.WorkShiftEnd = undefined;
    /*Зарплата*/
    this.Salary = undefined;
    /*Требующиеся ресурсы*/
    this.RequiredResources = undefined;
};


/*Сохраненная информация о предприятиях на карте*/
var objectInfo = {
    /*Возвращает сохраненную информацию об объекте*/
    get: function (id) {
        if (id) {
            var result = {
                /*Обновить информацию*/
                update: function() {
                    var storedObj = storage.getObject(objectInfo.getStorageKey(this.Id));
                    for (var key in storedObj) {
                        this[key] = storedObj[key];
                    }
                },
                /*Сохранить изменения*/
                store: function () {
                    storage.setObject(objectInfo.getStorageKey(this.Id), this);
                },
                /*Идентификатор объекта*/
                Id: id,
                /*Время полученной информации*/
                ActualTime: undefined,
                /*Название*/
                Name: undefined,
                /*Сектор на карте мира*/
                SectorId: undefined,
                /*Баланс*/
                Balance: undefined,
                /*Количество занятых рабочих мест*/
                UseWorkPlaceCount: undefined,
                /*Количество свободных рабочих мест*/
                FreeWorkPlaceCount: undefined,
                /*Время окончания смены*/
                WorkShiftEnd: undefined,
                /*Зарплата*/
                Salary: undefined,
                /*Требующиеся ресурсы*/
                RequiredResources: undefined
            };
            result.update();
            return result;
        }
        else {
            log('object id is undefined');
        }
    },
    /*Сохраняет информацию об объекте*/
    /*set: function (id, value) {       
        storage.setObject(this.getStorageKey(id), value);
    },*/
    /*Возвращает ключ сохраненного значения*/
    getStorageKey: function(id) { return 'objectInfo_' + id; }
};


/*Адреса входа в игру*/
var availableHostNames = [
    'www.heroeswm.ru',
    'qrator.heroeswm.ru',
    '178.248.235.15'
];

var guildTimeout = {
    /*Гильдия рабочих: 60 минут*/
    Worker: 3600000,
    /*Гильдия воров: 60 минут*/
    Thief: 3600000,
    /*Гильдия охотников для БУ 1-3: 5 минут*/
    //HunterLowLevel:  300000,
    /*Гильдия охотников днем: 40 минут*/
    //Hunter: 2400000
}

/*Сектора на карте мира*/
var mapSectors = [
        { Name: "Empire Capital", Id: 1, X: 50, Y: 50, },
        { Name: "East River", Id: 2, X: 51, Y: 50, ClosedWays: [14] },
        { Name: "Tiger Lake", Id: 3, X: 50, Y: 49, },
        { Name: "Rogues' Wood", Id: 4, X: 51, Y: 49 },
        { Name: "Wolf's Dale", Id: 5, X: 50, Y: 51 },
        { Name: "Peaceful Camp", Id: 6, X: 50, Y: 48 },
        { Name: "Lizard's Lowlands", Id: 7, X: 49, Y: 51 },
        { Name: "Green Wood", Id: 8, X: 49, Y: 50 },
        { Name: "Eagle Nest", Id: 9, X: 49, Y: 48 },
        { Name: "Portal's Ruins", Id: 10, X: 50, Y: 52 },
        { Name: "Dragons' Caves", Id: 11, X: 51, Y: 51 },                
        { Name: "Shining Spring", Id: 12, X: 49, Y: 49 },
        { Name: "Sunny City", Id: 13, X: 48, Y: 49 },
        { Name: "Magma Mines", Id: 14, X: 52, Y: 50 },
        { Name: "Bear Mountain", Id: 15, X: 52, Y: 49 },
        { Name: "Fairy Trees", Id: 16, X: 52, Y: 48 },
        { Name: "Harbour City", Id: 17, X: 53, Y: 50 },
        { Name: "Mithril Coast", Id: 18, X: 53, Y: 49 },
        { Name: "Great Wall", Id: 19, X: 51, Y: 52 },
        { Name: "Titans' Valley", Id: 20, X: 51, Y: 53 },
        { Name: "Fishing Village", Id: 21, X: 52, Y: 53 },
        { Name: "Kingdom Castle", Id: 22, X: 52, Y: 54 },
        { Name: "Ungovernable Steppe", Id: 23, X: 48, Y: 48 },
        { Name: "Crystal Garden", Id: 24, X: 51, Y: 48 },

        { Name: "The Wilderness", Id: 26, X: 49, Y: 52 },
        { Name: "Sublime Arbor", Id: 27, X: 48, Y: 50 }
];

/*Возвращает сектор по его названию*/
function getSectorByName(name)
{
    for (var ii = 0; ii < mapSectors.length; ii++)
    {
        if (mapSectors[ii].Name == name)
        {
            return mapSectors[ii];
        }
    }
}

/*Возвращает сектор по координатам*/
function getSectorByCoords(x, y)
{
    for (var ii = 0; ii < mapSectors.length; ii++)
    {
        if (mapSectors[ii].X == x && mapSectors[ii].Y == y)
        {
            return mapSectors[ii];
        }
    }
}

/*document.createElement*/
function createElement(tagName, className) {
    var result = document.createElement(tagName);
    if (className) {
        result.className = className;
    }
    return result;
}

/*document.createTextNode*/
function createTextNode(data) {
    return document.createTextNode(data);
}

/*GM_addStyle*/
function addStyle(style) {
    GM_addStyle(style);
}

/*GM_log*/
function log(message) {

    if (!settings || (settings && !settings.AllowLog)) {
        return;
    }
    if (!message) {
        message = 'undefined message';
    }
    GM_log(message);
}



/*Удаляет все стили из документа*/
function clearStyles() {
    var styles = document.querySelectorAll('style');
    for (var ii = 0; ii < styles.length; ii++) {
        styles[ii].parentNode.removeChild(styles[ii]);
    }
}

/*Удаляет все скрипты из документа*/
function clearScripts() {
    var scripts = document.querySelectorAll('script');
    for (var ii = 0; ii < scripts.length; ii++) {
        scripts[ii].parentNode.removeChild(scripts[ii]);
    }
}

/*Настройка страницы входа*/
function setupSiteMainPage() {
    clearAllTimeouts();
    clearScripts();
    clearStyles();
    document.body.innerHTML = '';

    addStyle('body { background: white ; color: black; }\
    .wmt-root { font-size: 15px;  }\
    .wmt-root label { display: block; }\
    .wmt-root label span { display: inline-block; min-width: 100px; text-align: right; }\
    .wmt-root form input[type="submit"] { margin-left: 100px; min-width: 200px; }\
    .wmt-host-select { margin: 5px;  padding: 10px 5px; width: 200px; }\
    .wmt-authority-input { padding: 5px 10px; margin: 10px; }');

    var root = createElement('div');
    root.className = 'wmt-root';
    document.body.appendChild(root);

    //Select Host
    var hostSelect = createElement('select');
    hostSelect.className = 'wmt-host-select';
    for (var ii = 0; ii < availableHostNames.length; ii++) {
        var option = createElement('option');
        option.appendChild(createTextNode(availableHostNames[ii]));
        option.value = availableHostNames[ii];
        if (location.hostname == option.value)
        {
            option.selected = true;
        }
        hostSelect.appendChild(option);
    }
    var hostCpt = createElement('span');
    hostCpt.appendChild(createTextNode('Хост'));
    var hostLabel = createElement('label');
    hostLabel.appendChild(hostCpt);
    hostLabel.appendChild(hostSelect);
    root.appendChild(hostLabel);

    /*Login field*/
    var loginInput = createElement('input');
    loginInput.className = 'wmt-authority-input';
    loginInput.type = 'text';
    loginInput.name = 'login';
    loginInput.maxLength = 16;
    var loginCpt = createElement('span');
    loginCpt.appendChild(createTextNode('Логин'));
    var loginLabel = createElement('label');
    loginLabel.appendChild(loginCpt);
    loginLabel.appendChild(loginInput);

    /*Password field*/
    var passInput = createElement('input');
    passInput.className = 'wmt-authority-input';
    passInput.type = 'password';
    passInput.name = 'pass';
    passInput.maxLength = 20;
    var passCpt = createElement('span');
    passCpt.appendChild(createTextNode('Пароль'));
    var passLabel = createElement('label');
    passLabel.appendChild(passCpt);
    passLabel.appendChild(passInput);

    /*hidden fields*/
    var redirect = createElement('input');
    redirect.type = 'hidden';
    redirect.name = 'LOGIN_redirect';
    redirect.value = '1';

    var lreseted = createElement('input');
    lreseted.type = 'hidden';
    lreseted.name = 'lreseted';
    lreseted.value = '0';  
    
    var preseted = createElement('input');
    preseted.type = 'hidden';
    preseted.name = 'preseted';
    preseted.value = '0';  
    
    var loginBtn = createElement('input');
    loginBtn.type = 'submit';
    loginBtn.value = 'Вход';
    

    var loginForm = createElement('form');
    loginForm.method = 'POST';
    loginForm.action = '/login.php';
    loginForm.appendChild(redirect);
    loginForm.appendChild(loginLabel);
    loginForm.appendChild(lreseted);
    loginForm.appendChild(passLabel);
    loginForm.appendChild(preseted);
    loginForm.appendChild(loginBtn);
    root.appendChild(loginForm);

    hostSelect.addEventListener('change', function() {
        var index = hostSelect.selectedIndex;
        if (index >= 0 && index < hostSelect.options.length)
        {
            loginForm.action = 'http://' + hostSelect.options[index].value + '/login.php';
        }        
    });    
}

/*Возвращает элементы главного меню*/
function getMenuItems()
{
    return [
        { Title:'\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u0436', Href: 'home.php', 
            Items: [
                { Title:'\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430', Href: 'pl_info.php?id=' + commonInfo.PlayerID },			
                { Title:'\u0417\u0430\u043C\u043E\u043A', Href: 'castle.php' },
                { Title:'\u041D\u0430\u0432\u044B\u043A\u0438', Href: 'skillwheel.php' },
                { Title: '\u041F\u0440\u043E\u0442\u043E\u043A\u043E\u043B\u00A0\u043F\u0435\u0440\u0435\u0434\u0430\u0447', Href: 'pl_transfers.php?id=' + +commonInfo.PlayerID },
                { Title: '\u041F\u0440\u043E\u0442\u043E\u043A\u043E\u043B\u00A0\u0431\u043E\u0435\u0432', Href: 'pl_warlog.php?id=' + +commonInfo.PlayerID },
                { Title: '\u041F\u0440\u043E\u0442\u043E\u043A\u043E\u043B\u00A0\u0438\u0433\u0440', Href: 'pl_cardlog.php?id=' + +commonInfo.PlayerID },
                { Title: '\u041D\u0430\u0431\u043E\u0440\u00A0\u0430\u0440\u043C\u0438\u0438', Href: 'army.php' },
                { Title: '\u041F\u043E\u0447\u0442\u0430', Href: 'sms.php' },
                { Title: '\u0420\u0435\u0439\u0442\u0438\u043D\u0433', Href: 'plstats.php' }
            ]
        },
        { Title:'\u0418\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u044C', Href: 'inventory.php', Items: [			
                { Title:'\u041C\u0430\u0433\u0430\u0437\u0438\u043D\u00A0\u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u043E\u0432', Href: 'shop.php' },
                { Title:'\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u044B\u00A0\u0441\u0443\u0449\u0435\u0441\u0442\u0432', Href: 'arts_for_monsters.php' }
        ]
        },
        {
            Title:'\u0420\u044B\u043D\u043E\u043A', Href: 'auction.php', Items: [
                    { Title:'\u0412\u044B\u0441\u0442\u0430\u0432\u0438\u0442\u044C\u00A0\u043B\u043E\u0442', Href: 'auction_new_lot.php' },
                    { Title:'\u0412\u0430\u0448\u0438\u00A0\u0442\u043E\u0432\u0430\u0440\u044B', Href: 'auction.php?cat=my&sort=0' }
            ]
        },
        { Title:'\u041A\u0430\u0440\u0442\u0430', Href: 'map.php?st=sh', Items: [
                { Title: '\u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430', Href: 'map.php?st=fc' },
                { Title: '\u0414\u043E\u0431\u044B\u0447\u0430', Href: 'map.php?st=mn' },
                { Title: '\u0414\u043E\u043C\u0430', Href: 'map.php?st=hs' },
                { Title: '\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C\u00A0\u043E\u0445\u043E\u0442\u0443', Href: 'map.php?action=skip' },
                { Title: '\u0413\u0438\u043B\u044C\u0434\u0438\u044F\u00A0\u043D\u0430\u0435\u043C\u043D\u0438\u043A\u043E\u0432', Href: 'mercenary_guild.php' },
                { Title: '\u042D\u043A\u043E\u043D\u043E\u043C\u0438\u0447\u0435\u0441\u043A\u0430\u044F\u00A0\u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430', Href: 'ecostat.php'},
                { Title: 'Toggle map', Action: toggleMap },
                { Title: 'ShowTextMap', Action: showTextMap }
        ]
        },
        { Title:'\u0411\u043E\u0438', Href: 'bselect.php', Items: [
                { Title: '\u0422\u0443\u0440\u043D\u0438\u0440\u044B', Href: 'tournaments.php' },
                { Title: '\u0413\u0438\u043B\u044C\u0434\u0438\u044F\u00A0\u0442\u0430\u043A\u0442\u0438\u043A\u043E\u0432', Href: 'pvp_guild.php'}
        ]
        },
        { Title:'\u0424\u043E\u0440\u0443\u043C', Href: 'forum.php', Items: [
                { Title:'\u0422\u0430\u0432\u0435\u0440\u043D\u0430', Href: 'tavern.php' },	
                { Title:'\u0427\u0430\u0442', Href: 'frames.php' },
                { Title: '\u0421\u043F\u0440\u0430\u0432\u043A\u0430', Href: 'help.php' },
                { Title: '\u0412\u0441\u0435\u00A0\u043D\u0430\u0432\u044B\u043A\u0438', Href: 'skillwheel_demo.php' },
                { Title: '2048', Href: '2048.html' }
        ]
        }
        /*
        //Портал
        ,{ Title: '\u041F\u043E\u0440\u0442\u0430\u043B', Href: 'tj_event2.php', Items: [
                { Title: '\u0410\u0440\u043C\u0438\u044F', Href: 'tj_set.php' },
                { Title: '\u041A\u0430\u043B\u044C\u043A\u0443\u043B\u044F\u0442\u043E\u0440', Href: 'http://demin.hdd1.ru/calc/' }
            ]	
        }*/
        /*
        //Пираты
        , {
            Title: '\u041F\u0438\u0440\u0430\u0442\u044B', Href: 'pirate_event.php', Items: [
                { Title: '\u041F\u043E\u0440\u0442\u043E\u0432\u044B\u0439\u00A0\u0433\u043E\u0440\u043E\u0434', Href: 'map.php?cx=53&cy=50' }
            ]
        }
        */
    ];
}

/*Отображает тукущую прочность одетых вещей*/
function showItemsCurrentDurability() {
    addStyle('.wmt-item-current-durability { position: absolute;  color: white; background: rgba(60, 60, 60, 0.5);\
border-radius: 2px; border-bottom-right-radius: 5px; \
min-width: 1.8em; text-align: center; -moz-user-select: none; user-select: none; }');        

    var createDurabilitySpan = function(title) {
        var dm = /(\d+)\/\d+/.exec(title);
        if (dm)
        {
            var cd =  +dm[1];
            var sp = document.createElement('span');
            sp.innerHTML = cd;
            sp.className = 'wmt-item-current-durability';				
            if (cd < 4)
            {					
                sp.style.background = 'rgba(225, 5, 0, 0.5)';
            }
            return sp;
        }
    }
	
    /*Обычные вещи без значков*/
    var artImages = document.querySelectorAll('img[src*="/i/artifacts/"]');		
    for ( var ii = 0; ii < artImages.length; ii++)
    {
        var im = artImages[ii];
        var durSpan = createDurabilitySpan(im.title);
        if (durSpan)
        {
            im.parentNode.insertBefore(durSpan, im);
        }
    }
	
    /*Вещи со значками*/
    var artTables = document.querySelectorAll('table[background*="/i/artifacts/"]');
    for (var ii = 0; ii < artTables.length; ii++)
    {
        var tbl = artTables[ii];			
        var im = tbl.querySelector('img[src*="i/transparent.gif"]');
        if (im)
        {
            var durSpan = createDurabilitySpan(im.title);
            if (durSpan)
            {
                im.parentNode.insertBefore(durSpan, im);
            }
        }
    }
    
}

/*Возвращает количество миллисекунд прожедших с начала отсчета до момента вызова этой функции*/
function getCurrentTime() {
    return new Date().getTime();
}

/*Таймер гильдии
@constructor
@this {GuildTimer}
@param {String} caption Текст отображаемого элемента
@param {String} title Строка всплывающей подсказки
@param {number} Время начала ожидания в мс.
@param {number} Время ожидания в мс.
@param {DomNode} container Контенер, в который будет помещен отображаемый элемент
@param {string} storageKey Ключ  хранилища настроек (для пользовательского таймера)
*/
function GuildTimer(caption, title, lastTime, interval, container, storageKey) {
    
    /*Время ожидания*/
    this.interval = interval;
    /*Время начала ожидания*/
    this.lastTime = lastTime;
    /*Текст*/
    this.caption = caption;
    this.storageKey = storageKey;
    if (this.storageKey && !this.interval && !this.lastTime) {        
        var storedValue = storage.getObject(this.storageKey);
        if (storedValue) {
            for (var key in storedValue) {
                this[key] = storedValue[key];
            }               
        }
    }
    /*Возвращает остаток времени, мс*/
    this.getLost = function () {
        return this.interval + this.lastTime - getCurrentTime();
    };
    /*Возвращает строку оставшегося времени в формате мм:cc
    @param {number} lost Оставшееся время, мс
    */
    this.getLostStr = function (lost) {
        if (lost > 0) {
            lost = Math.floor(lost / 1000);
            var s = lost % 60;
            if (s < 10) {
                s = '0' + s;
            }
            var m = Math.floor(lost / 60);
            if (m < 10) {
                m = '0' + m;
            }
            return m + ':' + s;
        }
        else {
            return '--:--';
        }
    }
        
    this.captionElement = createElement('span', 'wmt-gt-title');
    this.captionElement.appendChild(createTextNode(caption));
    this.timeElement = createElement('span', 'wmt-gt-time');
    this.timeElement.appendChild(createTextNode());
    this.flickerElement = createElement('span', 'wmt-gt-flicker-off');
    this.flickerElement.appendChild(createTextNode('·'));

    this.group = createElement('div', 'wmt-guild-timer');
    this.group.title = title;
    this.group.appendChild(this.captionElement);
    this.group.appendChild(this.flickerElement);
    this.group.appendChild(this.timeElement);
    var closureThis = this;
    if (this.storageKey) {
        this.group.addEventListener('click', function () {
            var tm = prompt('Время ожидания, мин.', '42');
            if (tm) {                
                closureThis.interval = (+tm) * 60000;
                closureThis.lastTime = getCurrentTime();
                storage.setObject(closureThis.storageKey, { interval: closureThis.interval, lastTime: closureThis.lastTime });
                closureThis.tick();
            }
            
        });
    }

    if (container) {
        container.appendChild(this.group);
    }
    /*Обновляет оставшееся время*/
    this.updateTime = function(lost) {
        this.timeElement.innerHTML = this.getLostStr(lost);
    }
        
}

/*Мигание*/
GuildTimer.prototype.DoFlickering = function () {
    var timer = this;
    timer.flickerElement.className = 'wmt-gt-flicker-on';
    setTimeout(function () {
        timer.flickerElement.className = 'wmt-gt-flicker-off';
    }, 300)
}

/*Обновление таймера*/
GuildTimer.prototype.tick = function () {
    var timer = this;
    setTimeout(function () { timer.DoFlickering(); }, 500);
    var lost = timer.getLost();
    timer.updateTime(lost);
    if (lost > 0) {
        setTimeout(function () { timer.tick(); }, 1000);
    }
}

/*Создает таймер ГР, размещая его в указанном узле*/
function WorkTimer(container) {
    var tm = new GuildTimer('ГР', 'Время до следующей работы', personalInfo.LastWork.Time, guildTimeout.Worker, container);
    tm.tick();
    return tm;
}

/*Создает таймер ГО, размещая его в указанном узле*/
function HuntTimer(container) {
    var tm = new GuildTimer("ГО", 'Время до следующей охоты', personalInfo.Hunt.Time, personalInfo.Hunt.Interval, container)
    tm.tick();
    return tm;
}

/*Создает таймер по требованию*/
function CustomTimer(container) {
    var tm = new GuildTimer('М1', 'Свой таймер', undefined, undefined, container, 'OwnTimer1');
    tm.tick();
    return tm;
}

/*Заменяет оригинальное меню*/
function showCustomMainMenu(sourceMenuTable) {
    addStyle('.head { text-align: center; border-bottom-width: thin; border-bottom-style: inset; border-top-width: thin; border-top-style: inset; padding-top: 3px; padding-bottom: 3px; position: relative; z-index: 100; }\
     .inbattle { background: tomato; }\
     .time { float: right;  margin-right: 10px; font-weight: bold; font-size: 14px; }\
     .resources { display: block; text-align: center; }\
     .resources img { margin: 2px; }\
     .resources td { vertical-align: middle; }\
     .radio { float: right; margin-right: 10px; }\
     .radio img { height: 12px; width: 12px; }\
     .notify { float: right; margin: 2px; margin-right: 5px; padding: 3px; background: yellow; border: solid 1px; border-radius: 8px; }\
     .notify img { height: 16px; width: 16px; vertical-align: middle; }\
     .gray { background: lightgray; }\
     .hidden { display: none; }\
     div.menu{}\
     div.menuitem { display: inline-block; position: relative; margin: 1px; font-size: 16px; /*color: darkgray;*/ }\
     div.menuitem div.title{ position: relative;	left: 0; top: 0; color: darkgray; }\
     div.menuitem a { font-size: inherit; margin-right: 5px; margin-top: 2px; background: inherit; display: inline-block; text-decoration: none; }\
     div.menuitem a:hover { text-decoration: underline; }\
     div.menuitem div.items { padding: 3px; text-align: left; overflow: hidden; height: 1px; position: absolute; left: 0; top: 0;\
     transition: top 10s linear;}\
     div.menuitem:hover div.items { height: inherit; transform: translateY(20px); background: lightgray; }\
    head .timer-panel { float: left; }');

    var createMenuItem = function (item) {
        var menuItem = createElement('div', 'menuitem');
        
        if (item.Items && item.Items.length > 0) {
            var items = createElement('div', 'items');            
            for (var ii = 0; ii < item.Items.length; ii++) {
                var subItem = item.Items[ii];
                var itemLink = createElement('a');
                itemLink.innerHTML = subItem.Title;
                if (subItem.Action) {
                    itemLink.onclick = subItem.Action;
                    itemLink.href = "#";
                }
                else {
                    itemLink.href = subItem.Href;
                }
                items.appendChild(itemLink);
                if (ii != item.Items.length - 1) {
                    items.appendChild(createElement('br'));
                }
            }
            menuItem.appendChild(items);
        }

        var titleDiv = createElement('div', 'title');

        var titleA = createElement('a');
        titleA.appendChild(createTextNode(item.Title));
        titleA.href = item.Href;
        titleDiv.appendChild(titleA);

        menuItem.appendChild(titleDiv);
        return menuItem;
    }

    var createMenu = function () {
        var menu = createElement('div', 'menu');        
        var menuItems = getMenuItems();
        for (var ii = 0; ii < menuItems.length; ii++) {
            menu.appendChild(createMenuItem(menuItems[ii]));
        }
        return menu;
    }

    var createNotify = function (notify) {
        var a = createElement('a');
        a.href = notify.Href;
        a.title = notify.Title;
        if (notify.Class) {
            a.className = notify.Class;
        }
        else {
            a.className = 'notify';
        }
        var img = createElement('img');
        img.src = notify.Src;
        //img.title = notify.Title;
        a.appendChild(img);
        return a;
    }

    var createResourceItem = function (value, imageSrc, imageAlt, imageHref) {
        var result = document.createDocumentFragment();

        var ci = createElement('td');

        var a = createElement('a');
        a.href =  getHostRelationLink(imageHref);
        var i = createElement('img');
        i.align = 'middle';
        i.src = imageSrc;
        i.alt = imageAlt;
        a.appendChild(i);
        ci.appendChild(a);
        result.appendChild(ci);

        var cv = createElement('td');
        cv.appendChild(createTextNode(value));
        result.appendChild(cv);

        return result;
    }
        
    var createHead = function() {
        var head = createElement('div', 'head');
        var menu = createMenu();
        if (commonInfo.InBattle) {
            menu.className += ' inbattle'
        }
        head.appendChild(menu);

        if (commonInfo.Time) {
            var ts = createElement('time', 'time');
            ts.title = 'Время сервера';            
            ts.datetime = commonInfo.Time;
            ts.appendChild(createTextNode(commonInfo.Time));
            head.appendChild(ts);
        }

        if (settings.ShowTimersInMenu) {
            var timerPanel = createElement('div', 'wmt-timer-panel');
            CustomTimer(timerPanel);
            WorkTimer(timerPanel);
            HuntTimer(timerPanel);
            head.appendChild(timerPanel);
        }

        if (commonInfo.Notifiers) {
            for (var ii = 0; ii < commonInfo.Notifiers.length; ii++) {
                head.appendChild(createNotify(commonInfo.Notifiers[ii]));
            }
        }

        if (commonInfo.HavingResources) {
            var rsc = createElement('table', 'resources');
            var soleRow = createElement('row');
            soleRow.appendChild(createResourceItem(commonInfo.Gold, commonInfo.GoldImg, 'gold', 'auction.php'));
            soleRow.appendChild(createResourceItem(commonInfo.Wood, commonInfo.WoodImg, 'wood', 'auction.php?cat=res&sort=0&type=1'));
            soleRow.appendChild(createResourceItem(commonInfo.Ore, commonInfo.OreImg, 'ore', 'auction.php?cat=res&sort=0&type=2'));
            soleRow.appendChild(createResourceItem(commonInfo.Mercury, commonInfo.MercuryImg, 'mercury', 'auction.php?cat=res&sort=0&type=3'));
            soleRow.appendChild(createResourceItem(commonInfo.Sulphur, commonInfo.SulphurImg, 'sulphur', 'auction.php?cat=res&sort=0&type=4'));
            soleRow.appendChild(createResourceItem(commonInfo.Crystal, commonInfo.CrystalImg, 'crystal', 'auction.php?cat=res&sort=0&type=5'));
            soleRow.appendChild(createResourceItem(commonInfo.Gem, commonInfo.GemImg, 'gem', 'auction.php?cat=res&sort=0&type=6'));
            rsc.appendChild(soleRow);
            head.appendChild(rsc);
        }

        return head;
    }    

    if (sourceMenuTable && sourceMenuTable.parentNode) {        
        sourceMenuTable.parentNode.insertBefore(createHead(), sourceMenuTable);
        sourceMenuTable.parentNode.removeChild(sourceMenuTable);
    }
}

/*Инициализация общих стилей */
function initializeCommonStyles()
{
    /*Таймеры*/
    if (settings.ShowTimersInMenu) {
        addStyle('.wmt-timer-panel { float: left; display: inline-block; }\
            .wmt-guild-timer { cursor:pointer; display: inline; padding: 3px; background-color:antiquewhite; border-right: 1px solid black; }\
            .wmt-gt-title { padding-right: 2px; padding-left: 5px; color: #0F9FDA; font-weight: bold; }\
            .wmt-gt-flicker-off { color: antiquewhite; }\
            .wmt-gt-flicker-on { color: red; }\
            .wmt-gt-time { font-weight: bold; }');
    }
    //Текстовая карта
    addStyle('.wmt-map-window { position: absolute; top: 10em; width: 100%; z-index: 101  }\
        .wmt-map-window>button { float: right; }\
        .wmt-map-table { border-collapse: collapse; width: 100%; }\
        .wmt-map-table tr { height: 3em; }\
        .wmt-map-table td { border-radius: 3px; text-align: center;  }\
        .wmt-map-empty-cell {  background: gray; }\
        .wmt-map-sector-cell { background: white; }\
        .wmt-map-view-link {  text-decoration: none; }\
        .wmt-map-move-link { padding-left: 0.5em; font-size: larger; text-decoration: none; }');
}
 
/*Переключатель видимости карты*/ 
function toggleMap()
{
	var newDisplay = settings.HideMap ? '' : 'none';
	settings.HideMap = !settings.HideMap;
	settings.store();	
	setMapObjectDisplay(newDisplay);	
}

/*Создает и показывает текстовую карту мира*/
function showTextMap()
{	
	var mapDiv = document.createElement('div');
	mapDiv.className = 'wmt-map-window';	
	var closeBtn = document.createElement('button');	
	closeBtn.appendChild(document.createTextNode('X'));
	closeBtn.addEventListener('click', function() { document.body.removeChild(mapDiv) });
	mapDiv.appendChild(closeBtn);
	
	var minSectorX = 50;
	var maxSectorX = 50;
	var minSectorY = 50;
	var maxSectorY = 50;
	
	for (var ii = 0; ii < mapSectors.length; ii++)
	{
		var sect = mapSectors[ii];
		if (sect.X > maxSectorX)
		{
			maxSectorX = sect.X;
		}
		if (sect.X < minSectorX)
		{
			minSectorX = sect.X;
		}
		if (sect.Y > maxSectorY)
		{
			maxSectorY = sect.Y;
		}
		if (sect.Y < minSectorY)
		{
			minSectorY = sect.Y;
		}
	}
	
	var columnCount = maxSectorX - minSectorX + 1;
	var rowCount = maxSectorY - minSectorY + 1;
	
	var mapTable = document.createElement('table');
	mapTable.className = 'wmt-map-table';
	for (var rowIndex = minSectorY; rowIndex <= maxSectorY; rowIndex++)
	{
		var row = mapTable.insertRow(mapTable.rows.length);
		for (var columnIndex = minSectorX; columnIndex <= maxSectorX; columnIndex++)
		{
			var cell = row.insertCell(row.cells.length);
			var sector = getSectorByCoords(columnIndex, rowIndex);
			if (sector)
			{
				cell.className = 'wmt-map-sector-cell';
				var sectorEl = document.createElement('a');
				sectorEl.className = 'wmt-map-view-link';
				sectorEl.title = 'Обзор сектора ' + sector.Name;
				sectorEl.href = '/map.php?cx=' + sector.X + '&cy=' + sector.Y;
				sectorEl.innerHTML = sector.Name + ' \uD83D\uDD0D';
				cell.appendChild(sectorEl);				
				
				var moveLink = document.createElement('a');
				moveLink.className = 'wmt-map-move-link';
				moveLink.href = '/move_sector.php?id=' + sector.Id;
				moveLink.title = 'Переместиться в сектор ' + sector.Name + '. (Нужен транспорт со сложным маршрутом)';
				moveLink.appendChild(document.createTextNode('\u265E'));
				cell.appendChild(moveLink);
			}
			else
			{
				cell.className = 'wmt-map-empty-cell';
			}
			
		}
	}
	
	mapDiv.appendChild(mapTable);
	
	document.body.appendChild(mapDiv);
}

/*Устанавливает свойству display элемента карты мира указанное значение */
function setMapObjectDisplay(value)
{
	var mapObj = document.querySelector('table[width="100"] div>object');
	if (mapObj)
	{
		mapObj.parentNode.style.display = value;
		var parent = mapObj.parentNode;
		while (parent)
		{
			if (parent && parent.nodeName.toLowerCase() == 'table' && (parent.width == "100" || parent.width == "50"))
			{
				parent.style.display = value;				
			}
			parent = parent.parentNode;
		}
	}
}	

function getHostRelationLink(path)
{
    return location.origin + '/' + path;
	//return location.protocol + '//' + location.host + '/' + path;
}

/*Удаляет все таймауты и интервалы*/
function clearAllTimeouts() {    
    var id = setTimeout(function () { }, 1);
    while (id >= 0) {
        clearTimeout(id--);
    }
    id = setInterval(function () { }, 1);
    while (id >= 0) {
        clearInterval(id--);
    }
}

/*Извлекает идентификатор персонажа из ссылки на его информацию*/
function getPlayerId(href) {
    var match = /player_info\.php\?id=(\d+)/.test(href);
    if (match) {
        return match[1];
    }
}

/*Анализ страницы map.php*/
function processMapPage(xmlDoc) {
    if (!xmlDoc) {
        log('xmlDoc undefined');
        return;
    }

    //Таймер охоты
    var deltaMatch = /var Delta2 = (\d+);/.exec(xmlDoc.body.innerHTML);
    if (deltaMatch) {
        personalInfo.update();
        personalInfo.Hunt.Interval = deltaMatch[1] * 1000;
        personalInfo.Hunt.Time = getCurrentTime();
        personalInfo.store();
    }
    else {
        log('delta2 not found');
    }

}

/*Возвращает идентфиикатор ячейки информации об объекте*/
function getObjectInfoCellId(objectId, valueKey) {
    return 'wmt_oic_' + objectId + '_' + valueKey;
}

/*Обновляет информацию по объекту*/
function updateObjectInfoRow(objInfo) {
    var balanceCell = document.getElementById(getObjectInfoCellId(objInfo.Id, 'Balance'));
    if (balanceCell) {
        balanceCell.innerHTML = objInfo.Balance;
    }
    var shiftEndCell = document.getElementById(getObjectInfoCellId(objInfo.Id, 'WorkShiftEnd'));
    if (shiftEndCell) {
        balanceCell.innerHTML = objInfo.WorkShiftEnd;
    }
    var placeCell = document.getElementById(getObjectInfoCellId(objInfo.Id, 'FreeWorkPlaceCount'));
    if (placeCell) {
        placeCell.innerHTML = objInfo.FreeWorkPlaceCount;
    }
}

/*Настройка страницы map.php*/
function setupMapPage() {
    if (settings.HideMap) {
        setMapObjectDisplay('none');
    }

    /*Ссылка на перемещение*/
    var sectorLink = document.querySelector('b>a[href*="map.php"]');
    if (sectorLink) {
        var sector = getSectorByName(sectorLink.textContent.trim());
        if (sector) {
            var moveLink = createElement('a');
            moveLink.innerHTML = '\u265E';
            moveLink.href = '/move_sector.php?id=' + sector.Id;
            sectorLink.parentNode.insertBefore(moveLink, sectorLink.nextSibling );
        }
        else {
            log('Sector not found: ' + sectorLink.textContent);
        }
    }

    /*Настройка таблицы объектов*/
    var objectsTable = document.querySelector('table.wb[width="500"]');
    if (objectsTable) {
        for (var ii = 0; ii < objectsTable.rows.length; ii++) {
            var row = objectsTable.rows[ii];
            /*Оставляем только колонку с названием и зарплатой*/
            row.removeChild(row.cells[1]);
            row.removeChild(row.cells[1]);
            row.removeChild(row.cells[1]);
            row.removeChild(row.cells[2]);
            /*Добавляем колонки Балланс, Места, Время окончания смены, колонку для кнопки обновить*/
            if (ii == 0) {
                var addHrow = function (title) {                    
                    var titleB = createElement('b');
                    titleB.appendChild(createTextNode(title));

                    var hCell = createElement('td', 'wbwhite');
                    hCell.appendChild(titleB);
                    row.appendChild(hCell);
                    return hCell;
                }
                addHrow('Баланс');
                addHrow('Конец смены').width = '16em';
                addHrow('Места').colSpan = 2;
            }
            else {
                var objLink = row.querySelector('a[href*="object-info.php"]');
                if (objLink) {
                    var objectId = getObjectId(objLink.href);
                    if (objectId) {

                        var addTCell = function (cellId) {
                            var resCell = createElement('td', row.cells[0].className);
                            resCell.id = cellId;
                            resCell.appendChild(createTextNode('-'));
                            row.appendChild(resCell);
                            return resCell;
                        };
                        addTCell(getObjectInfoCellId(objectId, 'Balance'));
                        addTCell(getObjectInfoCellId(objectId, 'WorkShiftEnd'));
                        addTCell(getObjectInfoCellId(objectId, 'FreeWorkPlaceCount'));

                        var objInfo = objectInfo.get(objectId);
                        if (objInfo) {
                            updateObjectInfoRow(objInfo);
                        }
                    }
                    else {
                        log('objectId not found');
                    }
                }
                else {
                    /*Другие строки без ссылки на объект*/
                    log('objLink not found');
                }
            }
        }
    }
    else {
        log('Objects table not found');
    }

}

/*Настройка страницы информации о персонаже*/
function setupPlayerInfoPage() {
    var pl_id = getPlayerId(location.href);
    if (!pl_id) {
        return;
    }

    if (settings.ShowItemsCurrentDurability) {
        showItemsCurrentDurability();
    }
}

/*Извлекает идентификатор объекта из ссылки на его страницу*/
function getObjectId(href) {
    var match = /object-info\.php\?id=(\d+)/.exec(href);
    if (match) {
        return match[1];
    }
}

/*Обработка информации содержащейся на странице информации об объекте. xmlDoc - обрабатываемый документ*/
function processObjectInfoPage(xmlDoc) {
    if (!xmlDoc) {
        log('xmlDoc undefined');
        return;
    }

    var objectId = getObjectId(location.href);
    if (!objectId) {
        log('objectId undefined: ' + objectId);
        return;
    }

    var workCodeImg = xmlDoc.querySelector('img[src*="work_codes"]');
    if (workCodeImg) {
        //Тут нужен update потому что вызов processObjectInfoPage может происходить в xmlhttpRequest
        personalInfo.update();
        if (personalInfo.LastWork.Image != workCodeImg.src) {
            personalInfo.LastWork.Image = workCodeImg.src;
            personalInfo.LastWork.CodeHour = commonInfo.getHour();
            personalInfo.store();
        }
    }
    else {
        /**/
        log('Not found workCodeImg');
    }

    var objInfo = objectInfo.get(objectId);
    if (!objInfo)
    {
        return;
    }

    var buyResForm = document.querySelector('form[name="buy_res"]');
    if (buyResForm) {
        var tbl = buyResForm.parentNode;
        var range = document.createRange();
        range.setStart(tbl.firstChild, 0);
        range.setEnd(buyResForm.previousSibling, 0);
        var headText = range.toString();

        var balanceMatch = /Баланс:\s(\d+(?:,\d{3})*)/.exec(headText);
        if (balanceMatch) {
            objInfo.Balance = balanceMatch[1].toString().replace(',', '');
        }

        var freePlaceMatch = /Свободных\sмест:\s(\d+)/.exec(headText);
        if (freePlaceMatch) {
            objInfo.FreeWorkPlaceCount = +freePlaceMatch[1];
        }

        var usedPlaceMatch = /Список\sрабочих\s\((\d+)\):/.exec(headText);
        if (usedPlaceMatch) {
            objInfo.UseWorkPlaceCount = +usedPlaceMatch[1];
        }

        var shiftEndMatch = /Окончание\sсмены:\s(\d{2}:\d{2})/.exec(headText);
        if (shiftEndMatch) {
            objInfo.WorkShiftEnd = shiftEndMatch[1];
        }
        else {
            log('No shiftEndMatch');
        }

        var salaryMatch = /Зарплата:\s(\d+)/.exec(headText);
        if (salaryMatch) {
            objInfo.Salary = +salaryMatch[1];
        }

        var mapLink = tbl.querySelector('a[href*="map.php?cx="]');
        if (mapLink) {
            var xm = /cx=(\d+)/.exec(mapLink.href);
            var ym = /cy=(\d+)/.exec(mapLink.href);
            if (xm && ym) {
                var sector = getSectorByCoords(xm[1], ym[1]);
                if (sector) {
                    objInfo.SectorId = sector.Id;
                }
                else {
                    log('no sector X:' + xm[1] + ' Y: ' + ym[1]);
                }
            }
            else {
                log('no coords ' + mapLink.href);
            }
        }
        else {
            log('no sector link');
        }
        
        objInfo.ActualTime = getCurrentTime();
        objInfo.store();
        log(JSON.stringify(objInfo));

    }
    else {
        log('Form with name "buy_res" is not found');
    }


    
}

/*Настройка страницы с информацией об объекте*/
function setupObjectInfoPage() {
    var objectId = getObjectId(location.href);
    if (!objectId) {
        log('objectId undefined: ' + objectId);
        return;
    }

    /*Форма покупки ресурса*/
    var buyResForm = document.querySelector('form[name="buy_res"]');
    if (!buyResForm) {
        log('buy_res form is not found');
        return;
    }    

    var workingForm = document.querySelector('form[name="working"]');    
    if (workingForm) {
        buyResForm.parentNode.insertBefore(workingForm, buyResForm.parentNode.firstChild);

    }
    else if (personalInfo.LastWork.Image) {
        addStyle('.wmt-last-code-lb { padding-left: 0.3em; font-size: small; font-weight: bold; }\
        .wmt-last-work-code { padding: 5px; width: 7em; margin: 3px; text-align: center; }\
.wmt-last-work-code-copy-btn { height: 2em; width: 2em; position: relative; top: 3px; }');

        var infoTable = createElement('table', 'wb');
        var headRow = infoTable.insertRow(0);
        var headCell = headRow.insertCell(0);
        headCell.align = 'center';
        headCell.className = 'wbwhite';
        var titleB = createElement('b');
        titleB.appendChild(createTextNode('Устройство на работу'));
        headCell.appendChild(titleB);

        var detailRow = infoTable.insertRow(1);
        var codeImgCell = detailRow.insertCell(0);        
        var workCodeImg = createElement('img');
        workCodeImg.title = 'Последний просмотренный код устройства на работу. Нажмите чтобы он исчез.';
        workCodeImg.src = personalInfo.LastWork.Image;
        workCodeImg.addEventListener('click', function () {
            personalInfo.update();
            personalInfo.LastWork.Image = undefined;
            personalInfo.LastWork.Code = undefined;
            personalInfo.store();
            infoTable.parentNode.removeChild(infoTable);
        });
        codeImgCell.appendChild(workCodeImg);

        var codeRow = infoTable.insertRow(2);

        var codeCell = codeRow.insertCell(0);
        var lb = createElement('span', 'wmt-last-code-lb');
        lb.innerHTML = 'Последний код:';
        codeCell.appendChild(lb);

        var lastCodeInput = createElement('input', 'wmt-last-work-code');
        lastCodeInput.type = 'text';
        if (personalInfo.LastWork.Code) {
            lastCodeInput.value = personalInfo.LastWork.Code;
        }
        lastCodeInput.addEventListener('change', function () {
            personalInfo.update();
            personalInfo.LastWork.Code = this.value;
            personalInfo.store();
        });
        codeCell.appendChild(lastCodeInput);

        var copyCodeBtn = createElement('button');
        copyCodeBtn.className = 'wmt-last-work-code-copy-btn';
        copyCodeBtn.innerHTML = '<img width="16" height="16" title="" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH1gETCToqhryocwAAAK1JREFUOMutkk0KwjAQhZ+QCxXEAwgueiB/0IXJIhLjgVwIHkCayZHqpglSJtO0+FaBDC9fPmblvL0C0JCjT4eLYW+ct/1UnLd9qVmlw+v9ZAd221ZEywXrZoMlyQVd/PyPIFCHQAEAQCFmV5xYloAo4rg/iy/fHzcNwLAE6dUasaKDGrGKa00ENWIVAD38ZxnBsKJmvJ1zCIqZ5YDLmIArFAumtlAqKIr9nQGAL0ezaR+0HlviAAAAAElFTkSuQmCC" />';
        copyCodeBtn.title = 'Копировать код в буфер обмена';
        copyCodeBtn.addEventListener('click', function () {
            GM_setClipboard(lastCodeInput.value);
        });
        codeCell.appendChild(copyCodeBtn);

        if (personalInfo.LastWork.ObjectId == objectId 
            && personalInfo.LastWork.Href) {
            //здесь вставить блок автоустройства до конца действия кода
        }
           

        buyResForm.parentNode.insertBefore(infoTable, buyResForm.parentNode.firstChild);
    }
}

/*Извлекает информацию о умениях фракций и уровне гильдий*/
function getFactionsAndGuildsInfo(xmlDoc) {
    if (xmlDoc) {
        var mod = xmlDoc.querySelector('div#mod_guild');
        if (mod) {
            var result = {};
            var cell = mod.parentNode;
            var infoPattern = /([А-Яа-яЁё\s:]+):\s*(\d+)\s*\((\d+(?:\.\d+)?)\)(?:\s*\+(\d+(?:\.\d+)?))?/g;
            var infoMatch;
            while ((infoMatch = infoPattern.exec(cell.textContent)) != null) {
                /*
                result.push({
                    key: infoMatch[1].trim(),
                    level: infoMatch[2],
                    score: infoMatch[3],
                    lost: infoMatch[4]
                });*/
                result[infoMatch[1].trim()] = {
                    level: infoMatch[2],
                    score: infoMatch[3],
                    lost: infoMatch[4]
                };
            }
            return result;
            log(JSON.stringify(result));
        }
        else {
            log('Selector "div#mod_guild" has not result');
        }
    }
}

/*Анализ данных страницы home.php*/
function processHomePage(xmlDoc) {
    if (!xmlDoc) {
        log('xmlDoc is undefined');
        return;
    }
    /*getFactionsAndGuildsInfo(document);*/    
}

/*Настройка страницы home.php*/
function setupHomePage() {
    /*Отдельный таймер ГР, если он не показывается в меню*/
    if (personalInfo.LastWork.Time && !settings.ShowTimersInMenu) {
        var lostMs = 3600000 - (new Date().getTime() - personalInfo.LastWork.Time);
        if (lostMs > 0) {
            var logoutB = document.querySelector('td.wbwhite[width="290"]>a[href*="logout.php"]>b');
            if (logoutB) {
                WorkTimer(logoutB.parentNode.parentNode.previousSibling.previousSibling);
            }
        }
    }

    if (settings.ShowItemsCurrentDurability) {
        showItemsCurrentDurability();
    }
}

/*Обработка страницы устройства на работу*/
function processObjectDoPage(xmlDoc) {
    if (!xmlDoc) {
        log('xmlDoc is undefined');
        return;
    }

    /*Код устройства*/
    var workCodeMatch = /object_do\.php\?id=(\d+)&code=(\w+)/.exec(xmlDoc.location.href);
    if (workCodeMatch) {
        personalInfo.LastWork.Code = workCodeMatch[2];
        personalInfo.LastWork.Href = xmlDoc.location.href;
        personalInfo.LastWork.ObjectId = workCodeMatch[1];
    }
    else {
        log('work code no match');
    }

    /*Проверка успешности устройства*/    
    var responseText = undefined;
    var response = xmlDoc.querySelector('td:first-child center:nth-child(2)');
    if (response) {
        responseText = response.textContent;
    }
    else {
        responseText = xmlDoc.body.textContent;
    }
    personalInfo.LastWork.ResponseText = responseText;    
    if (/Вы устроены на работу\./.test(responseText)) {
        personalInfo.LastWork.Time = getCurrentTime();
        personalInfo.LastWork.CodeHour = commonInfo.getHour();
        personalInfo.LastWork.Code = undefined;
        personalInfo.LastWork.Image = undefined;
    }
    personalInfo.store();        
}


/*Общеполезная информация, независимая от настроек*/
var commonInfo = { 
    /*Свой идентфикатор */
    PlayerID: undefined,
    /*Персонаж находится в  бою*/
    InBattle: undefined,
    /*Время по серверу*/
    Time: undefined,
    /*Возвращает номер часа по серверу*/
    getHour: function () {
        var match;
        if (this.Time && (match = /\d+/.exec(this.Time)) != null) {
            return match[0];
        }
    },
    /*Онлайн*/
    Online: undefined,
    /*Текущая страница содержит список ресурсов*/
    HavingResources: undefined,
    /*Количество золота*/
    Gold: undefined,
    /*Значок золота*/
    GoldImg: undefined,
    /*Количество древесины*/
    Wood: undefined,
    /*Значок древесины*/
    WoodImg: undefined,
    /*Количество руды*/
    Ore: undefined,
    /*Значок руды*/
    OreImg: undefined,
    /*Количество ртути*/
    Mercury: undefined,
    /*Значок ртути*/
    MercuryImg: undefined,
    /*Количество серы*/
    Sulphur: undefined,
    /*Значок серы*/
    SulphurImg: undefined,
    /*Количество кристаллов*/
    Crystal: undefined,
    /*Значок кристаллов*/
    CrystalImg: undefined,
    /*Количество самоцветов*/
    Gem: undefined,
    /*Значок самоцветов*/
    GemImg: undefined,
    /*Уведомления*/
    Notifiers: [],
    /*Обновляет общую информацию*/
    update: function (sourceMenuTable) {
        this.PlayerID = this.getPlayerIdFromCookies();
        if (!sourceMenuTable) {
            return;
        }
        var isRed = function (color) {
            return color == 'rgb(255, 0, 0)' || color == '#ff0000';
        }

        var NotifiersReg = [
            { Href: /tavern\.php$/, Src: /cards\.gif$/, Class: 'notify gray' },
            { Href: /tournaments\.php$/, Src: /2x2fast\.gif$/, Class: 'notify gray' },
            { Href: /group_wars.php$/, Src: /.+/ },
            { Href: /sms\.php$/, Src: /pismo\.gif$/ },
            { Href: /gift_box_log\.php$/, Src: /new_gift_box\.gif$/, Class: 'notify gray' },
            { Href: /hwm_donate_page_new\.php$/, Src: /diamond\.gif$/, Class: 'notify hidden' },
            { Href: /player\.php$/, Src: /radio_grey14\.gif$/, Class: 'radio' },
            { Href: /.+\.php/, Src: /.+/ }
        ];

        var menuRange = document.createRange();
        menuRange.selectNode(sourceMenuTable);
        var text = menuRange.toString();
        var n = /(\d{1,2}:\d{2}).\s(\d+)\sonline/.exec(text);
        if (n) {
            this.Time = n[1];
            this.Online = n[2];
        }

        var re = /(\d+(?:,\d{3})*)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/;
        var m = re.exec(text);
        if (m) {
            this.HavingResources = true;
            this.Gold = m[1];
            this.Wood = m[2];
            this.Ore = m[3];
            this.Mercury = m[4];
            this.Sulphur = m[5];
            this.Crystal = m[6];
            this.Gem = m[7];
        }

        var fr = menuRange.cloneContents();
        var t = fr.firstElementChild;
        var imgs = t.getElementsByTagName('img');
        for (var ii = 0; ii < imgs.length; ii++) {
            var src = imgs[ii].src;
            if (~src.indexOf('gold')) {
                this.GoldImg = src;
            }
            else if (~src.indexOf('wood')) {
                this.WoodImg = src;
            }
            else if (~src.indexOf('ore')) {
                this.OreImg = src;
            }
            else if (~src.indexOf('mercury')) {
                this.MercuryImg = src;
            }
            else if (~src.indexOf('sulphur')) {
                this.SulphurImg = src;
            }
            else if (~src.indexOf('crystal')) {
                this.CrystalImg = src;
            }
            else if (~src.indexOf('gem')) {
                this.GemImg = src;
            }
        }

        this.Notifiers = [];
        var as = t.getElementsByTagName('a');
        for (var ii = 0; ii < as.length; ii++) {
            var a = as[ii];

            var href = a.href;
            if (/home\.php/.test(href)) {
                if (isRed(a.style.color)) {
                    this.InBattle = true;
                }
            }

            var img = a.firstChild;
            if (img && img.tagName == 'IMG') {
                for (var jj = 0; jj < NotifiersReg.length; jj++) {
                    var nReg = NotifiersReg[jj];
                    if (nReg.Href.test(href) && nReg.Src.test(img.src)) {
                        this.Notifiers.push({ Href: href, Src: img.src, Title: img.title, Class: nReg.Class });
                        break;
                    }
                }
            }
        }
    },
    /*Получает идентификатор персонажа записанный в cookie*/
    getPlayerIdFromCookies: function () {
        var match = /pl_id\s*=\s*(\d+)/.exec(document.cookie);
        if (match) {
            return match[1];
        }        
    }

};

/**/
(function main() {
    log(location.pathname);
    settings.update();    

    //Замена стартовой страницы    
    if (location.pathname == '/' || location.pathname == '/index.php') {

        if (settings.UseSimpleStartPage) {
            setupSiteMainPage();
        }
        return;
    }

    var sourceMenuTable = document.querySelector('body>table:first-child');
    commonInfo.update(sourceMenuTable);

    personalInfo.update();
    personalInfo.clear();

    initializeCommonStyles();

    /*All pages contains mainMenu.
    Fill exludes section to avoid including main menu onto unnecessary pages
    Or invoke this method only onto necessary pages
    */    
    if (settings.UseCustomMenu) {
        showCustomMainMenu(sourceMenuTable);
    }

    if (location.pathname == '/home.php') {
        processHomePage(document);
        setupHomePage();
    }

    if (~location.pathname.indexOf('/map.php')) {
        processMapPage(document);
        setupMapPage();
    }

    if (~location.pathname.indexOf("object-info.php")) {
        processObjectInfoPage(document);
        setupObjectInfoPage();
    }

    if (~location.pathname.indexOf('/object_do.php')) {
        processObjectDoPage(document);
        history.back();
    }

    if (~location.pathname.indexOf('/pl_info.php')) {
        processPlayerInfoPage(document);
        setupPlayerInfoPage();
    }
    
})();
