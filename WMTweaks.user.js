// ==UserScript==
// @name WMTweaks
// @include http://178.248.235.15/*
// @include http://*.heroeswm.ru/*
// @exclude http://daily.heroeswm.ru/*
// @exclude http://*.heroeswm.ru/chatonline.php*
// @exclude http://*.heroeswm.ru/chat_line.php
// @exclude http://*.heroeswm.ru/ticker.html*
// @exclude http://*.heroeswm.ru/chatpost.php
// @exclude http://*.heroeswm.ru/ch_box.php
// @exclude http://*.heroeswm.ru/chat.php*
// @version 1.03
// @grant GM_log
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_setClipboard
// @grant GM_deleteValue
// @grant GM_addStyle
// @grant GM_xmlhttpRequest
// ==/UserScript==

function Debug_AddObjectInfo(obj, isJSON) {
	var div = document.createElement('div');
	div.style = 'display: inline-block; color: white; background: black;';
	div.innerHTML = isJSON ? JSON.stringify(obj) : Debug_GetObjectValuesString(obj);
	document.body.appendChild(div);
}

//u202F
function Debug_GetObjectValuesString(obj) {
    if (obj == undefined) {
        return "obj is undefined";
    }
    else {
        var result = 'obj: ';
        for (var key in obj) {
            result += '\n' + key + ': ' + obj[key];
        }
        return result;
    }
}

/*Адреса входа в игру*/
var availableHostNames = [
    'www.heroeswm.ru',
    'qrator.heroeswm.ru',
    '178.248.235.15'
];

/*Ускоренные задания по праздникам (Если нет ускорения то 1)*/
var holidayBoost = 1;

/*Таймауты гильдий!!??*/
var guildTimeout = {
	/*Гильдия рабочих: 60 минут*/
    Worker: 3600000,
    /*Гильдия воров: 60 минут*/
    Thief: 3600000,
    /*Возвращает интервал с учетом бонусов*/
    getThief: function () {
        return this.Thief * (OwnInfo.premiumEnabled ? 0.7 : 1) / holidayBoost;
    }
    /*Гильдия охотников для БУ 1-3: 5 минут*/
    //HunterLowLevel:  300000,
    /*Гильдия охотников днем: 40 минут*/
    //Hunter: 2400000
}

var craft_elements = [
	['абразив', 'abrasive'],
	['змеиный яд', 'snake_poison'],
	['клык тигра', 'tiger_tusk'],
	['ледяной кристалл', 'ice_crystal'],
	['лунный камень', 'moon_stone'],
	['огненный кристалл', 'fire_crystal'],
	['осколок метеорита', 'meteorit'],
	['цветок ведьм', 'witch_flower'],
	['цветок ветров', 'wind_flower'],
	['цветок папоротника', 'fern_flower'],
	['ядовитый гриб', 'badgrib'],	
];

/*Хранилище*/
var Storage = function () { }
Storage.getValue = function (key) {
    if (key) {
        return GM_getValue(key);
    }
}
Storage.setValue = function (key, value) {
    if (key) {
        if (value) {
            GM_setValue(key, value);
        }
        else {
            GM_deleteValue(key);
        }
    }
}
Storage.getJSON = function (key) {
    var valuestr = Storage.getValue(key);
    if (valuestr) {
        return JSON.parse(valuestr);
    }
}
Storage.setJSON = function (key, value) {
    Storage.setValue(key, JSON.stringify(value));
}
Storage.update = function (obj, sk) {
    if (obj == undefined) {
        return;
    }
    if (sk == undefined && typeof obj.getStorageKey == "function") {
        sk = obj.getStorageKey();
    }
    var storedObj = Storage.getJSON(sk);
    if (storedObj == undefined) {
        return;
    }
    for (var key in storedObj) {
        //log(sk + ': ' + key + ' = ' + storedObj[key]);
        obj[key] = storedObj[key];
    }
}
Storage.store = function (obj, key) {
    if (obj == undefined) {
        return;
    }
    if (key == undefined && typeof obj.getStorageKey == "function") {
        key = obj.getStorageKey();
    }
    var storedObj = {};
    for (var k in obj) {
        if (typeof obj[k] != "function")
        {
            storedObj[k] = obj[k];
        }
    }
    Storage.setJSON(key, storedObj);
}

/*Настройки скрипта*/
function Settings() { }
/*Разрешить показывать лог*/
Settings.allowLog = true;
/*Использовать простую страницу входа*/
Settings.useSimpleStartPage = true;
/*Использовать простое меню*/
Settings.useCustomMenu = true;
/*Таймеры свернуты*/
Settings.timersCollapsed = undefined; 
/*Показывать таймеры гильдий в меню*/
Settings.showTimersAmongMenu = true;
/*Показывать текущую прочность одетых предметов*/
Settings.showItemsCurrentDurability = true;
/*Интервал обновления игр в таверне, с*/
Settings.tavernRefreshDelay = 15;
/*Интервал обновления информации о предприятии, с*/
Settings.objectInfoRefreshDelay = 60;
/*Громкость звуков*/
Settings.soundGainValue = 1;
/*Скрывать карту*/
Settings.hideMap = false;
/*Кузнец*/
Settings.blacksmith = {
    name: undefined,
    level: undefined,
    priceRate: undefined
};
/*Скрыть охоты*/
Settings.hideHunt = false;
Settings.update = function () {
    Storage.update(Settings);
}
Settings.store = function () {
    Storage.store(Settings);    
}
Settings.getStorageKey = function () {
    return "Settings";
}


/*factions*/
function wmt_Faction() { }
wmt_Faction.level = [
    [0, 0, 0, 0],
    [20, 0, 1, 0],
    [50, 1, 0, 0],
    [90, 0, 0, 1],
    [160, 1, 0, 1],
    [280, 0, 1, 1],
    [500, 0, 0, 2],
    [900, 0, 2, 1],
    [1600, 2, 0, 1],
    [2900, 2, 2, 1],
    [5300, 2, 2, 2],
    [9600, 2, 3, 2],
    [17300, 3, 2, 2]    
];
/*Returns an array of summary bonuses from faction level.
 Values order is attack, defence, initiative*/
wmt_Faction.getLevelBonus = function(lvl){
    let result = [0, 0, 0];
    for (let l = lvl; l > 0; l--) {
        let bon = wmt_Faction.level[l];
        for (let ii = 0; ii < result.length; ii++) {
            result[ii] += bon[ii + 1];
        }
    }
    return result;
}
wmt_Faction.items = [
	[1, 0, 'рыцарь', 'рыцари', 'рыцаря', 'рыцарей'],
	[1, 1, 'рыцарь света', 'рыцари света', 'рыцаря света', 'рыцарей света'],
	[2, 0, 'некромант', 'некроманты', 'некроманта', 'некромантов'],
	[2, 1, 'некромант - повелитель смерти', 'некроманты - повелители смерти', 'некроманта - повелителя смерти', 'некромантов - повелителей смерти'],
	[3, 0, 'маг', 'маги', 'мага', 'магов' ],
	[3, 1, 'маг - разрушитель', 'маги - разрушители', 'мага - разрушителя', 'магов - разрушителей'],
	[4, 0, 'эльф', 'эльфы', 'эльфа', 'эльфов' ],
	[4, 1, 'эльф-заклинатель', 'эльфы-заклинатели', 'эльфа-заклинателя', 'эльфов-заклинателей' ],
	[5, 0, 'варвар', 'варвары', 'варвара', 'варваров'],
	[5, 1, 'варвар крови', 'варвары крови', 'варвара крови', 'варваров крови'],
	[5, 2, 'варвар - шаман', 'варвары - шаманы', 'варвара - шамана', 'варваров - шаманов'],
	[6, 0, 'тёмный эльф', 'тёмные эльфы', 'тёмного эльфа', 'тёмных эльфов'],
    [6, 1, 'тёмный эльф - укротитель', 'тёмные эльфы - укротители', 'тёмного эльфа - укротителя', 'тёмных эльфов - укротителей'],
	[7, 0, 'демон', 'демоны', 'демона' , 'демонов'],
	[7, 1, 'демон тьмы', 'демоны тьмы', 'демона тьмы', 'демонов тьмы'],
	[8, 0, 'гном', 'гномы', 'гнома', 'гномов'],
	[9, 0, 'степной варвар', 'степные варвары', 'степного варвара', 'степных варваров'],
];
wmt_Faction.getIconUrl = function(f, c) { 
    return 'http://dcdn.heroeswm.ru/i/r' + (f + (100 * c)) + '.gif';
}
wmt_Faction.parse = function (src) {
    let m;
    if (src && (m = /r(\d+)\.gif/.exec(src))) {
        let raceCode = parseInt(m[1]);
        return { f: raceCode % 100, c: Math.round(raceCode / 100) };
    }
    else {
        log('The race image source is unexpected: ' + src);
    }
}
/* 
 * Returns the name of faction
 * f - faction index
 * c - class index
 * k - name kind (0 - nominative singular, 1 - nominative plural, 2 - genetive singular , 3 - genetive plural
 */
wmt_Faction.getName = function(f, c, kind) {
	if (!kind) {
		kind = 0;
	}	
	for (let ii = 0; ii < wmt_Faction.items.length; ii++) {
		if (wmt_Faction.items[ii][0] == f && wmt_Faction.items[ii][1] == c) {
			return wmt_Faction.items[ii][2 + kind];
		}
	}
}

/*Mercenary guild task*/
function wmt_MT(){}
wmt_MT.taskPattern = [/-\s?захватчики$/, /-\s?разбойники$/, /-монстр$/, /-набеги$/, /^Отряд\s/, /^Армия\s/, /-\sзаговорщики$/];
wmt_MT.racePattern = [[/^рыц/i, /све/i], [/^(?:нек|пов)/i, /пов/i], [/^маг/i, /раз/i],	[/^эль/i, /зак/i], [/^вар/i, /кро/i, /шам/i], [/^тём/i], [/^дем/i, /тьм/i], [/^гно/i], [/^сте/i]];
wmt_MT.toString = function(task) {
	let kindText = [];
	for (let ii = 0; ii < task.kind.length; ii++) {
		let kind = task.kind[ii];
		if ([2, 3].includes(task.id)) {
			if (wmt_CR.all.length == 0) {
				wmt_CR.init();
			}
			if (wmt_CR.all.length > kind) {
				kindText.push(wmt_CR.all[kind].Name);
			}
			else {
				kindText.push('entity#' + kind);
			}
		}
		else {
			kindText.push(wmt_Faction.getName(kind % 100, Math.floor(kind / 100),
				([4, 5].includes(task.id) ? 3 : 1)));
		}
	}
	 
	let idText = kindText.join(([4, 5].includes(task.id) ? ' и ' : ', '));
	switch (task.id) {
		case 0:
			idText += ' - захватчики';
			break;
		case 1:
			idText += ' - разбойники';
			break;
		case 2:
			idText += ' - монстр';
			break;
		case 3:
			idText += ' - набеги';
			break;
		case 4:
			idText = 'Отряд ' + idText;
			break;
		case 5:
			idText = 'Армия ' + idText;
			break;
		case 6:
			idText += ' - заговорщики';
			break;
		default:
			idText += " - unknown type #" + task.id;
	}
	
	return idText[0].toUpperCase() + idText.slice(1) + ' {' + task.level + '}';
}
wmt_MT.parse = function(text) {
	var task = {};		
	let level = /{(\d+)}/.exec(text); 
	if (!level) {
		log('Не удалось определить уровень задания в строке: "' + text + '"');
		return;
	}
	task.level = parseInt(level[1]);
	text = text.replace(/{(\d+)}/, '').trim();
	
	for (let ii = 0; ii < wmt_MT.taskPattern.length; ii++) {
		if (wmt_MT.taskPattern[ii].test(text)) {
			task.id = ii;
			text = text.replace(wmt_MT.taskPattern[ii], '').trim();
			break;			
		}
	}
	
	if (task.id == undefined) {
		log('Не удалось определить тип задания в строке: "' + text + '"');
		return;
	}
	else { 
		task.kind = [];
	}
	
	if ([2, 3].includes(task.id)) {
		if (wmt_CR.all.length == 0) {
        		wmt_CR.init();
   		 }
		for (let ii = 0; ii < wmt_CR.all.length; ii++) {
			if (wmt_CR.all[ii].Name == text) {
				task.kind.push(ii);	
				break;
			}	
		}
	}
	else {
		var kinds = text.split([4, 5].includes(task.id) ? ' и ' : ',');		
		for (let ii = 0; ii < kinds.length; ii++) {
			for (let jj = 0; jj < wmt_MT.racePattern.length; jj++) {
				if (wmt_MT.racePattern[jj][0].test(kinds[ii].trim())) {
					for (let kk = 1; kk < wmt_MT.racePattern[jj].length; kk++) {
						if (wmt_MT.racePattern[jj][kk].test(kinds[ii].trim())) {
							jj +=  100 * kk; //We will get here the class code 101, 102 and so on 		
							break;
						}
					}
					task.kind.push(jj+1);
					break;
				}
			}
		}	
	}
	return task;			
} 


function wmt_CR(code, name, exp, hp) {
    if (name != undefined && code != undefined && exp != undefined && hp != undefined) {
        this.Name = name;
        this.Code = code;
        this.Exp = exp;
        this.Hp = hp;
    }
    else {
        return wmt_CR.find({ name: name, code: code });
    }
}
wmt_CR.prototype = { Code: '', Name: '', Exp: 0, Hp: 0 }
wmt_CR.all = [];
wmt_CR.add = function (name, code, exp, hp) {
    var cr = new wmt_CR(code, name, exp, hp);
    wmt_CR.all.push(cr);
    return cr;
}
wmt_CR.init = function () {    
    wmt_CR.add('Золотые драконы', 'golddragon', 800, 169);
    wmt_CR.add('Свободные циклопы', 'untamedcyc', 700, 225);
    wmt_CR.add('Кровоглазые циклопы', 'bloodeyecyc', 500, 235);
    wmt_CR.add('Чёрные драконы', 'blackdragon', 400, 240);
    wmt_CR.add('Титаны', 'titan', 400, 190);
    wmt_CR.add('Изумрудные драконы', 'emeralddragon', 400, 200);
    wmt_CR.add('Кристальные драконы', 'crystaldragon', 400, 200);
    wmt_CR.add('Степные циклопы', 'cyclopus', 390, 220);
    wmt_CR.add('Высшие ангелы', 'seraph2', 390, 220);
    wmt_CR.add('Древние бегемоты', 'ancientbehemoth', 390, 250);
    wmt_CR.add('Архангелы', 'archangel', 390, 220);
    wmt_CR.add('Колоссы', 'colossus', 350, 175);
    wmt_CR.add('Бегемоты', 'behemoth', 350, 210);
    wmt_CR.add('Зелёные драконы', 'greendragon', 350, 200);
    wmt_CR.add('Сумеречные драконы', 'shadowdragon', 350, 200);
    wmt_CR.add('Ангелы', 'angel', 330, 180);
    wmt_CR.add('Магма драконы', 'magmadragon', 329, 280);
    wmt_CR.add('Архидемоны', 'archdemon', 312, 211);
    wmt_CR.add('Архидьяволы', 'archdevil', 311, 199);
    wmt_CR.add('Призрачные драконы', 'spectraldragon', 310, 160);
    wmt_CR.add('Великие левиафаны', 'upleviathan', 300, 250);
    wmt_CR.add('Фениксы', 'phoenix', 300, 777);
    wmt_CR.add('Костяные драконы', 'bonedragon', 280, 150);
    wmt_CR.add('Паладины', 'paladin', 262, 100);
    wmt_CR.add('Огненные драконы', 'firedragon', 255, 230);
    wmt_CR.add('Чемпионы', 'champion', 252, 100);
    wmt_CR.add('Ифриты султаны', 'efreetisultan', 250, 100);
    wmt_CR.add('Левиафаны', 'leviathan', 250, 200);
    wmt_CR.add('Адские жнецы', 'zhryak', 250, 99);
    wmt_CR.add('Дьяволы', 'devil', 245, 166);
    wmt_CR.add('Рыцари', 'cavalier', 232, 90);
    wmt_CR.add('Древние энты', 'ancienent', 210, 181);
    wmt_CR.add('Дикие энты', 'savageent', 210, 175);
    wmt_CR.add('Вестники смерти', 'wraith', 205, 100);
    wmt_CR.add('Рогатые жнецы', 'rapukk', 200, 99);
    wmt_CR.add('Ифриты', 'efreeti', 200, 90);
    wmt_CR.add('Тёмные виверны', 'foulwyvern', 195, 105);
    wmt_CR.add('Пещерные владыки', 'pitlord', 195, 120);
    wmt_CR.add('Рыцари смерти', 'deadknight', 190, 100);
    wmt_CR.add('Энты', 'treant', 187, 175);
    wmt_CR.add('Владычицы тени', 'matriarch', 185, 90);
    wmt_CR.add('Циклопы-короли', 'cyclopking', 182, 95);
    wmt_CR.add('Черные тролли', 'blacktroll', 180, 180);
    wmt_CR.add('Циклопы', 'cyclop', 172, 85);
    wmt_CR.add('Виверны', 'wyvern', 170, 90);
    wmt_CR.add('Пещерные отродья', 'pity', 165, 140);
    wmt_CR.add('Умертвия', 'wight', 165, 95);
    wmt_CR.add('Громовержцы', 'thunderlord', 162, 120);
    wmt_CR.add('Раджи ракшас', 'rakshasa_raja', 160, 140);
    wmt_CR.add('Рыцари тьмы', 'blackknight', 160, 90);
    wmt_CR.add('Пещерные демоны', 'pitfiend', 157, 110);
    wmt_CR.add('Сумеречные ведьмы', 'shadow_witch', 157, 80);
    wmt_CR.add('Принцессы ракшас', 'rakshasa_rani', 155, 120);
    wmt_CR.add('Тролли', 'troll', 150, 150);
    wmt_CR.add('Глубоководные черти', 'upseamonster', 140, 105);
    wmt_CR.add('Кошмары', 'nightmare', 140, 66);
    wmt_CR.add('Кони преисподней', 'hellkon', 138, 66);
    wmt_CR.add('Адские жеребцы', 'hellcharger', 136, 50);
    wmt_CR.add('Боевые единороги', 'silverunicorn', 135, 77);
    wmt_CR.add('Мумии фараонов', 'pharaoh', 135, 70);
    wmt_CR.add('Таны', 'thane', 131, 100);
    wmt_CR.add('Злой кроля 2011', 'evilbunny', 130, 111);
    wmt_CR.add('Единороги', 'unicorn', 124, 57);
    wmt_CR.add('Адепты', 'zealot', 121, 80);
    wmt_CR.add('Инквизиторы', 'inquisitor', 121, 80);
    wmt_CR.add('Морские черти', 'seamonster', 120, 90);
    wmt_CR.add('Пещерные гидры', 'deephydra', 115, 125);
    wmt_CR.add('Птицы грома', 'thunderbird', 115, 65);
    wmt_CR.add('Мумии', 'mummy', 115, 50);
    wmt_CR.add('Злой тигр 2010', 'eviltiger2010', 110, 100);
    wmt_CR.add('Джинны-султаны', 'djinn_sultan', 110, 45);
    wmt_CR.add('Архиличи', 'archlich', 110, 55);
    wmt_CR.add('Гидры', 'hydra', 108, 80);
    wmt_CR.add('Старшие друиды', 'ddhigh', 105, 34);
    wmt_CR.add('Роки', 'rocbird', 104, 55);
    wmt_CR.add('Джинны', 'djinn', 103, 40);
    wmt_CR.add('Монахи', 'priest', 101, 54);
    wmt_CR.add('Верховные друиды', 'druideld', 101, 38);
    wmt_CR.add('Старейшины рун', 'runepatriarch', 100, 70);
    wmt_CR.add('Вожаки', 'chieftain', 100, 48);
    wmt_CR.add('Высшие личи', 'masterlich', 100, 55);
    wmt_CR.add('Тёмные всадники', 'grimrider', 94, 50);
    wmt_CR.add('Проворные наездники', 'briskrider', 94, 60);
    wmt_CR.add('Личи', 'lich', 87, 50);
    wmt_CR.add('Палачи', 'executioner', 83, 40);
    wmt_CR.add('Дочери неба', 'sdaughter', 75, 35);
    wmt_CR.add('Огры-маги', 'ogremagi', 74, 65);
    wmt_CR.add('Друиды', 'druid', 74, 34);
    wmt_CR.add('Дочери земли', 'eadaughter', 72, 35);
    wmt_CR.add('Сирены-искусительницы', 'upsiren', 70, 24);
    wmt_CR.add('Убийцы', 'slayer', 70, 34);
    wmt_CR.add('Высшие вампиры', 'vampirelord', 70, 35);
    wmt_CR.add('Архимаги', 'archmage', 70, 30);
    wmt_CR.add('Бычок 2009', 'byll2009', 69, 69);
    wmt_CR.add('Вампиры', 'vampire', 68, 30);
    wmt_CR.add('Камнегрызы', 'kamnegryz', 67, 55);
    wmt_CR.add('Демонессы', 'succubusmis', 67, 30);
    wmt_CR.add('Шаманки', 'shamaness', 66, 30);
    wmt_CR.add('Искусительницы', 'seducer', 65, 26);
    wmt_CR.add('Наездники на ящерах', 'darkrider', 65, 40);
    wmt_CR.add('Земные элементали', 'earth', 63, 75);
    wmt_CR.add('Маги', 'mage', 63, 18);
    wmt_CR.add('Штурмовые грифоны', 'battlegriffon', 62, 52);
    wmt_CR.add('Имперские грифоны', 'impergriffin', 62, 35);
    wmt_CR.add('Суккубы', 'succubus', 61, 20);
    wmt_CR.add('Огненные элементали', 'fire', 60, 43);
    wmt_CR.add('Сирены', 'siren', 60, 20);
    wmt_CR.add('Огры', 'ogre', 60, 50);
    wmt_CR.add('Грифоны', 'griffon', 59, 30);
    wmt_CR.add('Жрецы рун', 'runepriest', 59, 60);
    wmt_CR.add('Воздушные элементали', 'air', 59, 30);
    wmt_CR.add('Князья вампиров', 'vampireprince', 70, 40);
    wmt_CR.add('Свирепые бегемоты', 'dbehemoth', 410, 280);
    wmt_CR.add('Могильные големы', 'dgolemup', 400, 400);
    wmt_CR.add('Големы смерти', 'dgolem', 329, 350);
    wmt_CR.add('Астральные драконы', 'ghostdragon', 310, 150);
    wmt_CR.add('Баньши', 'banshee', 205, 110);
    wmt_CR.add('Циклопы-генералы', 'cyclopod', 187, 100);
    wmt_CR.add('Птицы тьмы', 'darkbird', 120, 60);
    wmt_CR.add('Огненные птицы', 'firebird', 117, 65);
    wmt_CR.add('Огры-ветераны', 'ogrebrutal', 75, 70);
    wmt_CR.add('Акульи бойцы', 'wanizame', 66, 31);
    wmt_CR.add('Боевые маги', 'battlemage', 72, 29);
    wmt_CR.add('Буйволы', 'buffalo', 120, 120);
    wmt_CR.add('Владыки бездны', 'pitlord6', 640, 280);
    wmt_CR.add('Воины-пантеры', 'panther6', 185, 90);
    wmt_CR.add('Всадники солнца', 'sunrider', 210, 90);
    wmt_CR.add('Воины-ягуары', 'jaguar6', 170, 85);
    wmt_CR.add('Грифоны солнца', 'igriffin', 180, 85);
    wmt_CR.add('Демоны бездны', 'pitfiend6', 600, 270);
    wmt_CR.add('Духи морей', 'mizukami', 163, 76);
    wmt_CR.add('Духи ручьёв', 'springspirit', 155, 70);
    wmt_CR.add('Изверги', 'lacerator', 180, 85);
    wmt_CR.add('Кирины', 'kirin', 650, 255);
    wmt_CR.add('Крестоносцы солнца', 'suncrusader', 240, 95);
    wmt_CR.add('Кентавры-мародёры', 'mcentaur6', 170, 80);
    wmt_CR.add('Кэнсеи', 'kensei', 196, 90);
    wmt_CR.add('Кэнши', 'kenshi', 172, 80);
    wmt_CR.add('Ловцы снов', 'dreamreaver6', 210, 100);
    wmt_CR.add('Матки-породительницы', 'mbreeder', 180, 75);
    wmt_CR.add('Небесные воители', 'celestial', 720, 300);
    wmt_CR.add('Лучезарное сияние', 'blazingglory', 170, 70);
    wmt_CR.add('Непокорные циклопы', 'cyclop6', 900, 330);
    wmt_CR.add('Кшатрии ракшасы', 'rakshasa_kshatra', 162, 135);
    wmt_CR.add('Разъяренные циклопы', 'ecyclop6', 1100, 360);
    wmt_CR.add('Серафимы', 'seraph', 800, 325);
    wmt_CR.add('Священные кирины', 'sacredkirin', 710, 265);
    wmt_CR.add('Слоны', 'elephant', 200, 200);
    wmt_CR.add('Сноходцы', 'dreamwalker6', 180, 85);
    wmt_CR.add('Титаны шторма', 'stormtitan', 400, 190);
    wmt_CR.add('Породительницы', 'breeder', 160, 70);
    wmt_CR.add('Садисты', 'tormentor', 160, 80);
    wmt_CR.add('Ледяные девы', 'yukionna', 159, 72);
    wmt_CR.add('Грифоны света', 'griffin', 150, 75);
    wmt_CR.add('Непокорные кентавры', 'centaur6', 150, 70);
    wmt_CR.add('Сияние', 'radiantglory', 150, 65);
    wmt_CR.add('Снежные девы', 'snowmaiden', 143, 65);
    wmt_CR.add('Светлые единороги', 'pristineunicorn', 135, 80);
    wmt_CR.add('Визири джиннов', 'djinn_vizier', 110, 50);
    wmt_CR.add('Крушилы', 'crusher6', 72, 36);
    wmt_CR.add('Жеребцы', 'horse', 70, 70);
    wmt_CR.add('Сирины', 'fury6', 68, 33);
    wmt_CR.add('Непокорные гарпии', 'harpy6', 67, 29);
    wmt_CR.add('Адские церберы', 'cerber', 61, 28);
    wmt_CR.add('Безумцы', 'demented', 60, 28);
    wmt_CR.add('Гвардейцы', 'praetorian', 60, 32);
    wmt_CR.add('Громилы', 'mauler6', 60, 30);
    wmt_CR.add('Лилимы', 'lilim', 60, 24);
    wmt_CR.add('Магнитные големы', 'magneticgolem', 57, 28);
    wmt_CR.add('Водные элементали', 'water', 57, 43);
    wmt_CR.add('Могучие каппы', 'kappashoya', 57, 25);
    wmt_CR.add('Минотавры-надсмотрщики', 'taskmaster', 56, 40);
    wmt_CR.add('Минотавры-стражи', 'minotaurguard', 56, 35);
    wmt_CR.add('Камнееды', 'kamneed', 56, 45);
    wmt_CR.add('Гоблины-охотники', 'goblinhunter6', 56, 26);
    wmt_CR.add('Стальные големы', 'steelgolem', 54, 24);
    wmt_CR.add('Акульи стражи', 'sharkguard', 52, 25);
    wmt_CR.add('Злой Горыныч 2012', 'gorynych', 50, 112);
    wmt_CR.add('Адские гончие', 'hellhound6', 50, 22);
    wmt_CR.add('Адские суккубы', 'succubus6', 50, 20);
    wmt_CR.add('Арбалетчики солнца', 'marks', 50, 28);
    wmt_CR.add('Весталки', 'vestal', 50, 25);
    wmt_CR.add('Жемчужные жрицы', 'pearlp', 50, 22);
    wmt_CR.add('Непокорные гоблины', 'goblin6', 50, 23);
    wmt_CR.add('Помешанные', 'maniac', 50, 23);
    wmt_CR.add('Мегеры', 'bloodsister', 49, 24);
    wmt_CR.add('Фурии', 'fury', 49, 16);
    wmt_CR.add('Стражи', 'sentinel', 47, 23);
    wmt_CR.add('Боевые грифоны', 'battlegriffin', 45, 35);
    wmt_CR.add('Злой котик 2011', 'evilcat', 45, 31);
    wmt_CR.add('Злая крыса 2008', 'mad_rat', 45, 32);
    wmt_CR.add('Гарпии-ведьмы', 'harpyhag', 45, 15);
    wmt_CR.add('Злая Змея 2013', 'evilsnake', 45, 73);
    wmt_CR.add('Каппы', 'kappa', 44, 21);
    wmt_CR.add('Мастера лука', 'masterhunter', 42, 14);
    wmt_CR.add('Берсерки', 'berserker', 42, 25);
    wmt_CR.add('Лесные снайперы', 'arcaneelf', 42, 12);
    wmt_CR.add('Церберы', 'cerberus', 41, 15);
    wmt_CR.add('Арбалетчики света', 'cman', 40, 22);
    wmt_CR.add('Коралловые жрицы', 'coralp', 40, 18);
    wmt_CR.add('Послушницы', 'sister', 40, 19);
    wmt_CR.add('Минотавры', 'minotaur', 39, 31);
    wmt_CR.add('Эльфийские лучники', 'elf', 38, 10);
    wmt_CR.add('Орки-вожди', 'orcchief', 38, 18);
    wmt_CR.add('Орки-тираны', 'orcrubak', 38, 20);
    wmt_CR.add('Огненные гончие', 'hotdog', 36, 15);
    wmt_CR.add('Вармонгеры', 'warmong', 36, 20);
    wmt_CR.add('Хозяева медведей', 'blackbearrider', 36, 30);
    wmt_CR.add('Воры-колдуны', 'thiefmage', 35, 30);
    wmt_CR.add('Воры-убийцы', 'thiefarcher', 35, 40);
    wmt_CR.add('Воры-разведчики', 'thiefwarrior', 35, 45);
    wmt_CR.add('Чародеи-наёмники', 'mercwizard', 35, 36);
    wmt_CR.add('Ассасины', 'assassin', 33, 14);
    wmt_CR.add('Железные големы', 'iron_golem', 33, 18);
    wmt_CR.add('Злобные глаза', 'evileye', 33, 22);
    wmt_CR.add('Бехолдеры', 'beholder', 33, 22);
    wmt_CR.add('Танцующие с ветром', 'wdancer', 33, 14);
    wmt_CR.add('Танцующие со смертью', 'wardancer', 33, 12);
    wmt_CR.add('Адские псы', 'hellhound', 33, 15);
    wmt_CR.add('Орки-шаманы', 'orcshaman', 33, 13);
    wmt_CR.add('Налётчики на волках', 'wolfraider', 31, 12);
    wmt_CR.add('Наездники на кабанах', 'boarrider', 31, 14);
    wmt_CR.add('Бестии', 'maiden', 30, 16);
    wmt_CR.add('Ядовитые пауки', 'spiderpois', 30, 11);
    wmt_CR.add('Кровавые ящеры', 'redlizard', 30, 35);
    wmt_CR.add('Ведьмы-призраки', 'cursed', 30, 20);
    wmt_CR.add('Орки', 'orc', 29, 12);
    wmt_CR.add('Гарпии', 'harpy', 29, 15);
    wmt_CR.add('Призраки', 'spectre', 27, 19);
    wmt_CR.add('Костоломы', 'brawler', 27, 20);
    wmt_CR.add('Духи', 'poltergeist', 27, 20);
    wmt_CR.add('Обсидиановые горгульи', 'obsgargoyle', 26, 20);
    wmt_CR.add('Привидения', 'ghost', 26, 8);
    wmt_CR.add('Гигантские ящеры', 'lizard', 25, 25);
    wmt_CR.add('Стихийные горгульи', 'elgargoly', 25, 16);
    wmt_CR.add('Воины-наёмники', 'mercfootman', 25, 24);
    wmt_CR.add('Горные стражи', 'mountaingr', 24, 12);
    wmt_CR.add('Наездники на медведях', 'bearrider', 24, 25);
    wmt_CR.add('Огненные демоны', 'hornedoverseer', 23, 13);
    wmt_CR.add('Степные бойцы', 'mauler', 23, 12);
    wmt_CR.add('Медведи', 'bear', 22, 22);
    wmt_CR.add('Боевые кентавры', 'mcentaur', 21, 10);
    wmt_CR.add('Латники', 'squire', 21, 26);
    wmt_CR.add('Степные воины', 'warrior', 21, 12);
    wmt_CR.add('Лазутчики', 'scout', 20, 10);
    wmt_CR.add('Дриады', 'sprite', 20, 6);
    wmt_CR.add('Нимфы', 'dryad', 20, 6);
    wmt_CR.add('Кочевые кентавры', 'ncentaur', 20, 9);
    wmt_CR.add('Старшие демоны', 'jdemon', 20, 13);
    wmt_CR.add('Степные волки', 'swolf', 20, 25);
    wmt_CR.add('Защитники веры', 'vindicator', 20, 23);
    wmt_CR.add('Наездники на волках', 'wolfrider', 20, 10);
    wmt_CR.add('Танцующие с клинками', 'dancer', 20, 12);
    wmt_CR.add('Арбалетчики', 'marksman', 19, 10);
    wmt_CR.add('Гарпунеры', 'harpooner', 18, 10);
    wmt_CR.add('Гниющие зомби', 'rotzombie', 17, 23);
    wmt_CR.add('Пехотинцы', 'footman', 17, 16);
    wmt_CR.add('Мастера копья', 'skirmesher', 17, 12);
    wmt_CR.add('Каменные горгульи', 'stone_gargoyle', 16, 15);
    wmt_CR.add('Стрелки', 'crossman', 16, 8);
    wmt_CR.add('Свинья 2007 года', 'pig2007', 16, 24);
    wmt_CR.add('Магоги', 'megogachi', 16, 13);
    wmt_CR.add('Лучники', 'archer', 15, 7);
    wmt_CR.add('Стрелки-наёмники', 'mercarcher', 15, 8);
    wmt_CR.add('Гоблины-трапперы', 'trapper', 15, 7);
    wmt_CR.add('Чумные зомби', 'plaguezombie', 15, 17);
    wmt_CR.add('Пауки', 'spider', 15, 9);
    wmt_CR.add('Рогатые демоны', 'horneddemon', 14, 13);
    wmt_CR.add('Кентавры', 'fcentaur', 13, 6);
    wmt_CR.add('Гоги', 'gogachi', 13, 13);
    wmt_CR.add('Детёныши ящера', 'smalllizard', 13, 13);
    wmt_CR.add('Феи', 'pixel', 12, 5);
    wmt_CR.add('Воители', 'shieldguard', 12, 12);
    wmt_CR.add('Скелеты-арбалетчики', 'skmarksman', 12, 6);
    wmt_CR.add('Зомби', 'zombie', 11, 17);
    wmt_CR.add('Метатели копья', 'spearwielder', 11, 10);
    wmt_CR.add('Черти', 'familiar', 10, 6);
    wmt_CR.add('Штурмовики', 'wfassault', 10, 100);
    wmt_CR.add('Мятежники', 'enforcer', 10, 7);
    wmt_CR.add('Скелеты-лучники', 'skeletonarcher', 10, 4);
    wmt_CR.add('Дьяволята', 'vermin', 10, 6);
    wmt_CR.add('Скелеты-воины', 'sceletonwar', 10, 5);
    wmt_CR.add('Гоблины-лучники', 'goblinarcher', 9, 3);
    wmt_CR.add('Хобгоблины', 'hobgoblin', 9, 4);
    wmt_CR.add('Старшие гремлины', 'mastergremlin', 9, 6);
    wmt_CR.add('Гремлины-вредители', 'saboteurgremlin', 9, 6);
    wmt_CR.add('Гоблины-маги', 'goblinmag', 9, 3);
    wmt_CR.add('Защитники гор', 'defender', 7, 7);
    wmt_CR.add('Ополченцы', 'conscript', 7, 6);
    wmt_CR.add('Скелеты', 'skeleton', 6, 4);
    wmt_CR.add('Бесы', 'imp', 6, 4);
    wmt_CR.add('Головорезы', 'brute', 6, 8);
    wmt_CR.add('Степные гоблины', 'goblinus', 5, 3);
    wmt_CR.add('Крестьяне', 'peasant', 5, 4);
    wmt_CR.add('Гремлины', 'gremlin', 5, 5);
    wmt_CR.add('Гоблины', 'goblin', 5, 3);
}
wmt_CR.find = function (condition) {
    if (wmt_CR.all.length == 0) {
        wmt_CR.init();
    }
    if (condition && (condition.code != undefined || condition.name != undefined)) {
        for (var ii = 0; ii < wmt_CR.all.length; ii++) {
            if (condition.code == wmt_CR.all[ii].Code || condition.Name == wmt_CR.all[ii].Name) {
                return wmt_CR.all[ii];
            }
        }
    }
    log('Not found creature on search condition: ' + JSON.stringify(condition));
}


/*Countdown timer
@constructor
@param {Object} d details
*/
function wmt_CT(d) {
    this.caption = d.caption;
    this.title = d.title;
    this.showAlways = d.showAlways;
    this.onclick = d.onclick;
    this.onfinish = d.onfinish;
    this.getStorageKey = d.getStorageKey;
    this.beforeUpdate = d.beforeUpdate;
    this.getStartTime = d.getStartTime;
    this.getInterval = d.getInterval;
    this.sync();
}
/*Разделитель минут и секунд*/
wmt_CT.ts = ':';
/*Интервал синхронизации, мс*/
wmt_CT.syncDelay = 1000;
wmt_CT.prototype = {
    /*Метод возвращающий переменную в которой хранятся настройки, если задан значит пользовательский таймер*/
    getStorageKey: undefined,
    /*Отображать всегда или только во время работы*/
    showAlways: undefined,
    /*Метод выполняющийся перед обновлением*/
    beforeUpdate: undefined,
    /*Обновляет время запуска и интервал*/
    update: function () {
        var t = this;
        if (t.beforeUpdate) {
            t.beforeUpdate();
        }
        if (t.getStorageKey) {            
            Storage.update(t);            
        }
        else {
            t.startTime = t.getStartTime();
            t.interval = t.getInterval();
        }
    },
    /*Заголовок*/
    caption: undefined,
    /*Обработчик нажатия кнопки мыши по заголовку*/
    onclick: function () { },
    /*Обработчик окончания работы*/
    onfinish: function() {},
    /*Всплывающая подсказка*/
    title: undefined,
    /*Корневой элемент*/
    rootNode: undefined,
    /*Элемент названия*/
    captionNode: undefined,
    /*Элемент времени левый*/
    timeNodeLeft: undefined,
    /*Элемент времени правый*/
    timeNodeRight: undefined,
    /*Элемент разделитель времени*/
    flickerNode: undefined,
    /*Время начала*/
    startTime: undefined,
    /*Интервал*/
    interval: undefined,
    /*Возвращает время начала, мс*/
    getStartTime: function () { },
    /*Возвращает интервал, мс*/
    getInterval: function () { },
    /*Инициализирует элементы интерфейса пользователя*/
    initUI: function () {
        var t = this;
        t.captionNode = createElement('span', 'wmt-gt-title');
        t.captionNode.appendChild(createTextNode(t.caption));
        if (t.onclick) {
            t.captionNode.addEventListener('click', t.onclick);
        }
        t.timeNodeLeft = createElement('span', 'wmt-gt-time');
        t.timeNodeRight = createElement('span', 'wmt-gt-time');
        t.flickerNode = createElement('span', 'wmt-gt-flicker-on');
        t.flickerNode.appendChild(createTextNode(wmt_CT.ts));

        t.rootNode = createElement('div', 'wmt-guild-timer');
        t.rootNode.appendChild(t.captionNode);
        t.rootNode.appendChild(t.timeNodeLeft);
        t.rootNode.appendChild(t.flickerNode);
        t.rootNode.appendChild(t.timeNodeRight);
        t.rootNode.title = t.title;
        if (t.getStorageKey) {            
            t.rootNode.addEventListener('click', function () { t.promptInterval(); } );
        }
    },
    /*Открывает диалог для ввода времени ожидания*/
    promptInterval: function () {
        var t = prompt('Время ожидания, мин.', '60');
        if (t) {        
            this.interval = (+t) * 60000;
            this.startTime = getCurrentTime();
            if (this.getStorageKey) {
                Storage.store({ interval: this.interval, startTime: this.startTime}, this.getStorageKey());
            }
            this.tick();
        }
    },
    /*Возвращает оставшееся до завершения время*/
    getLostTime: function () {
        var result = {};
        if (this.interval != undefined && this.startTime != undefined) {
            result.Ts = Math.floor((this.interval + this.startTime - getCurrentTime()) / 1000);
            result.Sec = padLeft(result.Ts % 60, 2, '0');
            var min = result.Ts / 60;
            if (min >= 60) {
                result.Min = padLeft(Math.floor(min % 60), 2, '0');
                result.Hrs = padLeft(Math.floor(min / 60), 2, '0');
            }
            else {
                result.Min = padLeft(Math.floor(min), 2, '0');
            }
        }
        else {
            result.Ts = 0;
        }
        return result;
    },
    /*Идет отсчет времени*/
    isRunning: function (lt) {
        if (!lt) {
            lt = this.getLostTime();
        }
        return lt.Ts > 0;
    },
    /*Добавляет визуальную часть в указанный узел*/
    appendTo: function (node, mode) {
        if (node) {
            if (!this.rootNode) {
                this.initUI();
            }
            if (!mode) {
                node.appendChild(this.rootNode);
            }
            else if (mode == 1) {
                node.parentNode.insertBefore(this.rootNode, node);
            }
            else if (mode == 2) {

            }
            this.run();
        }
    },
    /*Обеспечивает мигание разделителя времени*/
    doFlickering: function () {
        var t = this;
        if (t.flickerNode) {
            t.flickerNode.className = 'wmt-gt-flicker-off';
        }
        setTimeout(function () {
            if (t.flickerNode) {
                t.flickerNode.className = 'wmt-gt-flicker-on';
            }            
        }, 300)
    },
    /*Отображает оставшееся время*/
    updateTime: function (l) {
        if (l == undefined) {
            l = this.getLostTime();
        }
        if (this.isRunning(l)) {
            this.flickerNode.innerHTML = wmt_CT.ts;
            if (l.Hrs) {
                this.timeNodeLeft.innerHTML = l.Hrs;
                this.timeNodeRight.innerHTML = l.Min;
            }
            else {
                this.timeNodeLeft.innerHTML = l.Min;
                this.timeNodeRight.innerHTML = l.Sec;
            }
            
        }
        else {
            this.timeNodeLeft.innerHTML = '';
            this.timeNodeRight.innerHTML = '';
            this.flickerNode.innerHTML = '';
        }
    },
    /*Счетчик обновлений*/
    tickCount: undefined,
    /*Запуск/перезапуск*/
    run: function () {
        this.tickCount = 0;
        this.tick();
    },
    /*Обновляет время, перезапускает себя пока время не закончится*/
    tick: function () {
        var t = this;
        setTimeout(function () { t.doFlickering(); }, 500);
        var lt = t.getLostTime();
        t.updateTime(lt);
        if (t.isRunning(lt)) {
            setTimeout(function () { t.tick(); }, 1000);
            if (!t.showAlways) {
                t.rootNode.style.display = '';
            }
            t.tickCount++;
        }
        else {
            if (!t.showAlways) {
                t.rootNode.style.display = 'none';
            }
            //t.captionNode.style.color = '#455D63';
            if (t.onfinish && t.tickCount > 0) {
                t.onfinish();
                log(t.caption + ' (' + t.tickCount + ') onfinish executed');
            }
        }
    },
    /*Выполняет синхронизацию*/
    sync: function () {
        var t = this;
        var lt = t.getLostTime();
        t.update();
        var ln = t.getLostTime();
        if (t.rootNode && ln.Ts > 0 &&  Math.abs(ln.Ts - lt.Ts) > 2) {
            t.rootNode.style.display = '';            
            t.run();
            log(t.caption + ' restarted (' + (t.rootNode != undefined) +  ', ' +  ln.Ts + ', ' + lt.Ts);
        }
        setTimeout(function () { t.sync(); }, wmt_CT.syncDelay);
    }
}


/*Собранная информация о себе
TODO: переделать для возможности использования несколькими персонажами*/
function OwnInfo() { }
/*Актуальное время, мс*/
OwnInfo.actualTime = undefined;
/*Действет благословение Абу-Бекра*/
OwnInfo.premiumEnabled = true;
/*Дополнительный коэффициент эффективности работы*/
OwnInfo.workEfficiencyBonusFactor = 1;
/*Последняя работа*/
OwnInfo.LastWork = {
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
};
/*Последняя охота*/
OwnInfo.Hunt = {
    /*Оставшееся до охоты время, мс*/
    Interval: undefined,
    /*Время начала ожидания, мс*/
    Time: undefined
};
/*ГВ*/
OwnInfo.Thief = {
    Time: undefined,
    Interval: undefined
};
/*Время начала действия последнего выпитого напитка удачи*/
OwnInfo.TavernDrinkTime = undefined;
/*Последнее перемещение*/
OwnInfo.Movement = {
    /*Время засечки перемещения по карте, мс*/
    Time: undefined,
    /*Остаток времени перемещения по карте в момент засечки, мс*/
    Interval: undefined
};
/*Гильдия наемников*/
OwnInfo.Mercenary = {
	/*Время начала ожидания ГН*/
    Time: undefined,
	/*Остаток времени ожидания ГН*/
    Interval: undefined,
	/*История наград*/
	Rewards: undefined,
	/*Текущее задание*/
	Task: undefined,
	/*Проигранные задания*/
	Failed: undefined,
	/*Режим автопилота*/
	Autopilot: undefined,	
};
/*Здоровье*/
OwnInfo.HP = {
    /*Количество*/
    Amount: {
        /*Текущее*/
        Current: 100,
        /*Максимальное*/
        Maximum: 100
    },
    /*Время обнаружения сниженного здоровья, мс*/
    RestoreTime: undefined,
    /*Время до полного восстановления здоровья, мс*/
    RestoreInterval: undefined
};
/*Мана*/
OwnInfo.Mana = {
    /*Количество*/
    Amount: {
        /*Текущее*/
        Current: undefined,
        /*Максимальное*/
        Maximum: undefined
    },
    /*Время обнаружения сниженного здоровья, мс*/
    RestoreTime: undefined,
    /*Время до полного восстановления здоровья, мс*/
    RestoreInterval: undefined
}
/*Коэффициент трудоголика*/
OwnInfo.WorkaholicPenaltyFactor = 1;
/*Эффективность работы*/
OwnInfo.WorkEfficiencyFactor = 2.4;
/*Последний бой*/
OwnInfo.LastBattleId = undefined;
/*Уникальная подпись для передач ресурсов / предметов или выбрасывания предметов */
OwnInfo.transferSign = undefined;
OwnInfo.getStorageKey = function () { return 'OwnInfo_' + wmt_page.playerId; };
OwnInfo.update = function (obsoleteTime) {
    if (OwnInfo.actualTime == undefined
        || obsoleteTime == undefined
        || (getCurrentTime() - OwnInfo.actualTime) > obsoleteTime) {
        OwnInfo.actualTime = getCurrentTime();
        Storage.update(OwnInfo);
    }
    else {
        return;
    }
	if (obsoleteTime != undefined) return;
    /*Очистка сведений о последней работе по истечении таймаута или смене часа*/
    var workInformation = {
        lostTime: (getCurrentTime() - OwnInfo.LastWork.Time) > guildTimeout.Worker,
        hourChanged: OwnInfo.LastWork.CodeHour != wmt_page.getHour()
    };
    if (workInformation.lostTime || workInformation.hourChanged) {
        if (workInformation.lostTime) {
            OwnInfo.LastWork.Time = undefined;
        }
        OwnInfo.LastWork.CodeHour = undefined;
        OwnInfo.LastWork.Image = undefined;
        OwnInfo.LastWork.Code = undefined;
        OwnInfo.LastWork.Href = undefined;
        OwnInfo.LastWork.ResponseText = undefined;
    }

    if (wmt_page.hp.amount) {
        OwnInfo.HP.Amount.Current = wmt_page.hp.percent;
        OwnInfo.HP.Amount.Maximum = 100;
        if (wmt_page.hp.percent < 100) {
            OwnInfo.HP.RestoreTime = getCurrentTime();
            OwnInfo.HP.RestoreInterval = wmt_page.hp.restoreSpeed * ((100 - wmt_page.hp.percent) / 100);
        }
        else {
            OwnInfo.HP.RestoreTime = undefined;
            OwnInfo.HP.RestoreInterval = undefined;
        }
    }

    if (wmt_page.mana.amount) {
        OwnInfo.Mana.Amount.Maximum = wmt_page.mana.amount;
        if (wmt_page.mana.percent < 100) {
            OwnInfo.Mana.Amount = Math.floor(wmt_page.mana.amount * wmt_page.mana.percent / 100);
            OwnInfo.Mana.RestoreTime = getCurrentTime();
            OwnInfo.Mana.RestoreInterval = wmt_page.mana.restoreSpeed * (wmt_page.mana.amount / 100) * ((100 - wmt_page.mana.percent) / 100);
        }
        else {
            OwnInfo.Mana.RestoreTime = undefined;
            OwnInfo.Mana.RestoreInterval = undefined;
            OwnInfo.Mana.Amount.Current = wmt_page.mana.amount;
        }
    }
    OwnInfo.store();
};
OwnInfo.store = function () {
	Storage.store(OwnInfo);
};

/*Таймеры*/
function Timer() { }
/*Обновление собственной информации для таймеров*/
Timer.updateOwnInfo = function () { OwnInfo.update(wmt_CT.syncDelay); };
/*Таймер обратного отсчета до следующей работы*/
Timer.getWork = function () {
    if (Timer._work == undefined) {
        Timer._work = new wmt_CT({
            caption: '\u2692',
            title: 'Заврешение работы',
            showAlways: true,
            beforeUpdate: Timer.updateOwnInfo,
            getStartTime: function () { return OwnInfo.LastWork.Time; },
            getInterval: function () { return guildTimeout.Worker; },            
            onclick: function () { if (OwnInfo.LastWork.ObjectId) location.assign('/object-info.php?id=' + OwnInfo.LastWork.ObjectId); },
            onfinish: function () { wmt_Sound.playSequence('G 100, P 100, G 300, P 100, G 300, P 300 '); }
        });
    }
    return Timer._work;
}
/*Таймер обратного отсчета до следующей охоты*/
Timer.getHunt = function () {
    if (Timer._hunt == undefined) {
        Timer._hunt = new wmt_CT({
            caption: "\uD83D\uDC3E", title: 'Ожидание охоты',
            beforeUpdate: Timer.updateOwnInfo,
            getStartTime: function () { return OwnInfo.Hunt.Time; },
            getInterval: function () { return OwnInfo.Hunt.Interval; },
            onclick: function () { location.assign('map.php'); },
            onfinish: function () { wmt_Sound.playMorse('g1'); }
        });
    }
    return Timer._hunt;
}
/*Таймер ГН*/
Timer.getMercenary = function () {
    if (Timer._mercenary == undefined) {
        Timer._mercenary = new wmt_CT({
            caption: "\uD83C\uDFAF", title: 'Ожидание задания ГН',
            beforeUpdate: Timer.updateOwnInfo,
            getStartTime: function () { return OwnInfo.Mercenary.Time; },
            getInterval: function () { return OwnInfo.Mercenary.Interval; },
            onclick: function () { location.assign('/mercenary_guild.php'); },
            onfinish: function () { if (location.pathname == '/mercenary_guild.php') { wmt_Sound.beep(); location.reload(); } }
        });
    }
    return Timer._mercenary;
}
/*Таймер ГВ*/
Timer.getThief = function () {
    if (Timer._thief == undefined) {
        Timer._thief = new wmt_CT({
            caption: '\uD83C\uDFAD', title: 'Гильдия воров',
            beforeUpdate: Timer.updateOwnInfo,
            getStartTime: function () { return OwnInfo.Thief.Time; },
            getInterval: function () { return OwnInfo.Thief.Interval; },
            onfinish: function () { wmt_Sound.playMorse('g4'); }
        });
    }
    return Timer._thief;
}
/*Таймер таверны*/
Timer.getLuck = function () {
    if (!Timer._luck) {
        Timer._luck = new wmt_CT({
            caption: '\uD83C\uDF08', title: 'Следующий напиток удачи',
            beforeUpdate: Timer.updateOwnInfo,
            getStartTime: function () { return OwnInfo.TavernDrinkTime; },
            getInterval: function () { return 86400000; }
        });
    }
    return Timer._luck;
}
/*Произвольный таймер обратного отсчета*/
Timer.getOwn = function () {
    if (Timer._Own1 == undefined) {
        Timer._Own1 = new wmt_CT({
            caption: '\u23F0', title: 'Свой таймер 1',            
            getStorageKey: function () { return 'OwnTimer1' },
            onfinish: function () { wmt_Sound.playMorse('t1'); }
        });
    }
    return Timer._Own1;
}
/*Второй произвольный таймер обратного отсчета*/
Timer.getOwn2 = function () {
    if (Timer._Own2 == undefined) {
        Timer._Own2 = new wmt_CT({
            caption: '\uD83C\uDFC1', title: 'Свой таймер 2',
            getStorageKey: function () { return 'OwnTimer2' },
            onfinish: function () { wmt_Sound.playMorse('t2'); }
        });
    }
    return Timer._Own2;
}
/*Таймер перехода*/
Timer.getMovement = function () {
    if (Timer._Movement == undefined) {
        Timer._Movement = new wmt_CT({
            caption: '\uD83D\uDC0E', title: 'Перемещение по карте',
            beforeUpdate: Timer.updateOwnInfo,
            getStartTime: function () { return OwnInfo.Movement.Time; },
            getInterval: function () { return OwnInfo.Movement.Interval; },
            onfinish: wmt_Sound.beep
        });
    }
    return Timer._Movement;
}
/*Таймер восстановления здоровья*/
Timer.getHP = function () {
    if (Timer._HP == undefined) {
        Timer._HP = new wmt_CT({
            caption: '\uD83D\uDC94', title: 'Восстановление армии',
            beforeUpdate: Timer.updateOwnInfo,
            getStartTime: function () { return OwnInfo.HP.RestoreTime; },
            getInterval: function () { return OwnInfo.HP.RestoreInterval; }
        });
    }
    return Timer._HP;
}
/*Таймер восстановления маны*/
Timer.getMana = function () {
    if (Timer._Mana == undefined) {
        Timer._Mana = new wmt_CT({
            caption: '\u262F', title: "Восстановление маны",
            beforeUpdate: Timer.updateOwnInfo,
            getStartTime: function() { return OwnInfo.Mana.RestoreTime; },
            getInterval: function() {return OwnInfo.Mana.RestoreInterval; }
        })
    }
    return Timer._Mana;
}


/*Сохраняемая информация об объекте
@constructor
@param {number} id Идентификатор объекта
*/
function ObjectInfo(id) { this.id = id; };
ObjectInfo.prototype = {
    /*Идентификатор*/
    id : undefined,
    /*Время полученной информации*/
    actualTime : undefined,
    /*Название*/
    name: undefined,
    /*Сектор на карте мира*/
    sectorId: undefined,
    /*Баланс*/
    balance: undefined,
    /*Количество занятых рабочих мест*/
    useWorkPlaceCount: undefined,
    /*Количество свободных рабочих мест*/
    freeWorkPlaceCount: undefined,
    /*Время окончания смены*/
    workShiftEnd: undefined,
    /*Зарплата*/
    salary: undefined,
    /*Можно продать ресурсы*/
    canSellResources: undefined,
    /*Недостаточно ресурсов для устройства*/
    notEnoughResources: undefined,
    /*Запас золота на балансе из расчета среднего потребления*/
    _class: undefined,
    /*Количество часов*/
    requiredHours: undefined,
    /*Требующиеся ресурсы*/
    requiredResources: undefined,
    /*Расчет количества дней обеспеченных текущим балансом*/
    updateClass: function () {
        var spendingShift = 0;
        var workerCount = this.freeWorkPlaceCount + this.useWorkPlaceCount;
        var averageWorkerEfficiency = 2.5;
        spendingShift += averageWorkerEfficiency * this.salary * workerCount;
        if (this.requiredResources) {
            for (var ii = 0; ii < this.requiredResources.length; ii++) {
                spendingShift += this.requiredResources[ii].consumption * this.requiredResources[ii].price
                    * averageWorkerEfficiency * workerCount / this.requiredHours;
            }
        }
        this._class = Math.floor(this.balance / (spendingShift * 24));
    },
    update: function () {
        Storage.update(this);
    },
    store: function () {
        Storage.store(this);    
    },
    getStorageKey: function () {
        return 'ObjectInfo_' + this.id;
    }
}


/*Карта мира
@constructor
*/
function Map() {}
Map.sectors = [];
/*Посты ГН и ближайшие к ним сектора*/
Map.mercenaryPosts =  [
	[2, 1, 4, 5, 7, 8, 10, 11, 26, 27],
	[6, 3, 9, 12, 13, 23, 24],
	[16, 14, 15, 17, 18],
	[21, 19, 20, 22]];
Map.add = function (name, x, y) {
    Map.sectors.push({ id: Map.sectors.length + 1, name: name, x: x, y: y });
}
/*Находит и возвращает первый сектор совпадающий с предикатом*/
Map.find = function (predicate) {    
    for (var ii = 0; ii < Map.sectors.length; ii++) {
        if (predicate(Map.sectors[ii])) {
            return Map.sectors[ii];
        }
    }
}
/*Проходит по всем доступным секторам */
Map.forEachConcentric = function (details) {    
    let radius = 0;
    let passedSectors = [];
    let addIfExists = (x, y) => {
        let sector = Map.getSectorByCoordinates(x, y);
        if (sector) {
            passedSectors.push(sector);
            if (details.handleSector) {
                details.handleSector({ radius: radius, sector: sector });
            }
        }
    }
    let startSector;
    if (details.sectorX && details.sectorY) {
        startSector = Map.getSectorByCoordinates(details.sectorX, details.sectorY);
    }
    else  {
        if (!details.sectorId) {
            details.sectorId = 1;
        }
        startSector = Map.getSectorById(details.sectorId);
    }
    addIfExists(startSector.x, startSector.y);    
    while (passedSectors.length < Map.sectors.length) {
        radius++;

        let minX = startSector.x - radius;
        let maxX = startSector.x + radius;
        let minY = startSector.y - radius;
        let maxY = startSector.y + radius;
        
        for (let x = minX; x <= maxX; x++) {
            addIfExists(x, minY);
            addIfExists(x, maxY);
        }
        for (let y = minY + 1; y < maxY; y++) {
            addIfExists(minX, y);
            addIfExists(maxX, y);
        }
    }

}
Map.getSectorByName = function(name) { return Map.find(function(s) {return s.name == name; }); }
/*Возвращает сектор из указанной ссылки*/
Map.getSectorByHref = function (href) {
    if (href) {
        var cx = /cx=(\d+)/.exec(href);
        var cy = /cy=(\d+)/.exec(href);
        if (cx && cy) {
            var x = +cx[1];
            var y = +cy[1];
            var result = Map.getSectorByCoordinates(x, y);
            if (result) {
                return result;
            }
            else {
                log('Sector X:' + x + ' Y:' + y + ' is npt found');
            }
        }
        else {
            log('Sector not found: ' + href);
        }
    }
    else {
        log('Sector href is undefined');
    }
}
/*Возвращает сектор с указанными координатми*/
Map.getSectorByCoordinates = function (x, y) { return Map.find(function (s) { return s.x == x && s.y == y; }); }
/*Возвращает сектор с указанным идентификатором*/
Map.getSectorById = function (id) { return Map.find(function (s) { return s.id == id; }); }
/*Возвращает true если в указанном секторе есть пост наемников*/
Map.isMercenaryPostThere = function(id) {
	for (var ii = 0; ii < Map.mercenaryPosts.length; ii++) {
		if (Map.mercenaryPosts[ii][0] == id) {
			return true;
		}
	}
	return false;
}
/*Возвращает ближайший сектор с постом гильдии наемников*/
Map.getNearestSectorWithMercenaryPost = function(id) {
	for (var ii = 0; ii < Map.mercenaryPosts.length; ii++) {
		if (Map.mercenaryPosts[ii].includes(id)) {
			return Map.getSectorById(Map.mercenaryPosts[ii][0]);
		}
	}
}
/*Инициализирует */
Map.init = (function () {
    
    Map.sectors = [];
    Map.add("Empire Capital", 50, 50);//1
    Map.add("East River", 51, 50);
    Map.add("Tiger Lake", 50, 49);
    Map.add("Rogues' Wood", 51, 49);
    Map.add("Wolf Dale", 50, 51);//5
    Map.add("Peaceful Camp", 50, 48);
    Map.add("Lizard Lowland", 49, 51);
    Map.add("Green Wood", 49, 50);
    Map.add("Eagle Nest", 49, 48);
    Map.add("Portal Ruins", 50, 52);//10
    Map.add("Dragons' Caves", 51, 51);
    Map.add("Shining Spring", 49, 49);
    Map.add("Sunny City", 48, 49);
    Map.add("Magma Mines", 52, 50);
    Map.add("Bear Mountain", 52, 49);//15
    Map.add("Fairy Trees", 52, 48);
    Map.add("Harbour City", 53, 50);
    Map.add("Mithril Coast", 53, 49);
    Map.add("Great Wall", 51, 52);
    Map.add("Titans' Valley", 51, 53);//20
    Map.add("Fishing Village", 52, 53);
    Map.add("Kingdom Castle", 52, 54);
    Map.add("Ungovernable Steppe", 48, 48);
    Map.add("Crystal Garden", 51, 48);
    Map.add("East Island", 53, 52); //25
    Map.add("The Wilderness", 49, 52);
    Map.add("Sublime Arbor", 48, 50);
})();

/*Информация о предмете*/
function wmt_item(id) {
    this.id = id;
}
wmt_item.prototype = {
    /*Идентификатор*/
    id: undefined,
	/*Категория на рынке*/
	category: undefined,
    /*Название*/
    name: undefined,
    /*Стоимость объявленная*/
    value: undefined,
    /*Прочность базовая*/
    durability: undefined,
    /*Стоимость на карте*/
    mapValue: undefined,
    /*Цена ремонта*/
    repair: undefined,
    /*Возможно купить на карте*/
    mapBuyable: undefined,
    getValue: function () {
        var vl = 0;
        for (var key in this.value) {
            var m = 0;
            switch (key) {
                case 'gold':
                    m = 1;
                    break;
                case 'wood':
                case 'ore':
                    m = 180;
                    break;
                default:
                    m = 360;
            }
            vl += this.value[key] * m;
        }

        return vl;
    },
    getPpb: function () {
        if (this.durability == undefined) return 0;
		
        if (this.mapBuyable && this.mapValue) {
			return this.mapValue / this.durability;            			
        }
        else {
            return this.getValue() / this.durability;
        }
    },
    getStorageKey: function() { return 'wmt_item_' + this.id; },
    update: function () { Storage.update(this); },
    store: function () { Storage.store(this); },
	log: function() {
		log(JSON.stringify(this));
	}
};

/* Условия сдачи в аренду предмета*/
function wmt_item_rent(id) {
	this.id = id;
}
wmt_item_rent.prototype = {
	/*идентификатор группы или конкретного предмета*/
	id: undefined,
	/*Цена*/
	value: undefined,
	getStorageKey: function() {
		return 'wmt_item_rent' + this.id;
	},
	update: function() {
		Storage.update(this);		
	},
	store: function() {
		Storage.store(this);
	}	
}


/*Информация о персонаже*/
function wmt_hero(id) {
    this.id = id;
}
wmt_hero.prototype = {
    /**/
    id: undefined,
    /*Время последнего обновления*/
    actualTime: undefined,
    /*имя*/
    name: undefined,
    /*БУ*/
    level: undefined,
    /*Фракция*/
    faction: undefined,
    /*Класс*/
    altclass: undefined,
    /*Анти умения*/
    anti: undefined,
    /*Навыки*/
    perks: undefined,
    /*Армия*/
    army: undefined,
    /*Гильдии*/
    guilds: {
        hunter: undefined,
        worker: undefined
    },
    getStorageKey: function () { return 'wmt_hero_' + this.id; },
    update: function () { Storage.update(this); },
    store: function () { Storage.store(this); }
}

/*Информация о навыке*/
function wmt_perk(code, name, desc){
	this.code = code;
	this.name = name;
	this.desc = desc;
}
wmt_perk.prototype = {
	/*Код*/
	code: undefined,
	/*Название*/	
	name: undefined,
	/*Описание*/
	desc: undefined,
	getStorageKey: function(){
		return 'wmt_perk_' + this.code;
	},
	update: function(){
		Storage.update(this);
	},
	store: function() {
		Storage.store(this)
	}
}


/*Шкала уровней гильдии*/
function ScoreScale() {
    this.scaleSteps = arguments;
    if (!this.scaleSteps || this.scaleSteps.length == 0) {
        log('Levels scale is not set');
    }
    for (var ii = 0; ii <this.scaleSteps.length; ii++) {
        if (ii > 0 && this.scaleSteps[ii] < this.scaleSteps[ii - 1]) {
            log('Levels scale is incorrect: ' + JSON.stringify(this.scaleSteps));
        }
    }
}

/*Возвращает уровень по указанному количетсву очков*/
ScoreScale.prototype.getLevel = function (score) {
    if (!score) {
        log('Score is undefined');
        return;
    }
    var level = 0;
    while (level < this.scaleSteps.length && score >= this.scaleSteps[level]) {
        level++;
    }
    return level;
}

/*Гильдия рабочих
@constructor*/
function WorkerGuild() {
    this.ScoreScale = new LevelsScale(0, 90, 180, 360, 720, 1500, 3000, 5000, 8000, 12000,
        17000, 23000, 30000, 38000, 47000, 57000);
}

/*Возвращает эффективность работы*/
WorkerGuild.prototype.getWorkEfficency = function (level) {
    if (level > 1) {
        return 1 + (0.2 * (level - 1));
    }
    else {
        return 1 + (level * 0.1);
    }
}

/*Возвращает бонус к защите*/
WorkerGuild.prototype.getDefenceBonus = function (level) {
    return Math.floor(leve / 2);
}

/*Информация страницы несохраняемая
@constructor
*/
function wmt_page() {}
/*Идентфикатор персонажа*/
wmt_page.playerId = undefined;
/*Персонаж находится в бою*/
wmt_page.inBattle = undefined;
/*Время по серверу*/
wmt_page.time = undefined;
/*Онлайн*/
wmt_page.online = undefined;
/*Текущая страница содержит список ресурсов*/
wmt_page.havingResources = undefined;
/*Свое имя*/
wmt_page.nickName = undefined;
/*Текущее здоровье*/
wmt_page.hp = {
    /*Процент*/
    percent: undefined,
    /*Скорость восстановления, мс*/
    restoreSpeed: undefined,
    /*Количество в 100%*/
    amount: undefined
};
/*Текущая мана*/
wmt_page.mana = {
    /*Процент*/
    percent: undefined,
    /*Скорость восстановления, мс*/
    restoreSpeed: undefined,
    /*Количество в 100%*/
    amount: undefined
};
/*Ресурсы*/
wmt_page.resources = {
    /*Количество золота*/
    gold: undefined,
    /*Количество древесины*/
    wood: undefined,
    /*Количество руды*/
    ore: undefined,
    /*Количество ртути*/
    mercury: undefined,
    /*Количество серы*/
    sulphur: undefined,
    /*Количество кристаллов*/
    crystal: undefined,
    /*Количество самоцветов*/
    gems: undefined,
    /*Количество бриллиантов*/
    diamond: undefined
}
/*Картинки*/
wmt_page.images = {
    /*Значок золота*/
    gold: undefined,
    /*Значок древесины*/
    wood: undefined,
    /*Значок руды*/
    ore: undefined,
    /*Значок ртути*/
    mercury: undefined,
    /*Значок серы*/
    sulphur: undefined,
    /*Значок кристаллов*/
    crystal: undefined,
    /*Значок самоцветов*/
    gems: undefined,
    /*Значок бриллиантов*/
    diamond: undefined
};
/*Уведомления*/
wmt_page.notifiers = [];
/*Страница находится в фоновом режиме*/
wmt_page.isBlur = undefined;
/*Возвращает текущий час на сервере*/
wmt_page.getHour = function () {
    if (wmt_page.time) {
        var hm = /\d+/.exec(this.Time);
        if (hm) {
            return hm[0];
        }
    }
}
wmt_page.update = function () {
    window.addEventListener('focus', function () { wmt_page.isBlur = false; });
    window.addEventListener('blur', function () { wmt_page.isBlur = true; });
    window.addEventListener('keypress', function (e) { /*alert(Debug_GetObjectValuesString(e));*/
        if (e.keyCode == 27) {
            window.close();
        }
    })
    var match = /pl_id\s*=\s*(\d+)/.exec(document.cookie);
    if (match) {
        wmt_page.playerId = match[1];
    };

    var sourceMenuTable = document.querySelector('body>table');
    if (!sourceMenuTable) {
        return;
    }

    var heartVars = getFlashObjectVars(getFlashObjectByMovie('heart.swf', sourceMenuTable));
    if (heartVars && heartVars.length == 5) {
        wmt_page.hp.percent = +heartVars[0];
        wmt_page.hp.restoreSpeed = +heartVars[1] * 1000;
        wmt_page.hp.amount = +heartVars[2];
        wmt_page.nickName = heartVars[3];
    }

    var manaVars = getFlashObjectVars(getFlashObjectByMovie('mana.swf', sourceMenuTable));
    if (manaVars && manaVars.length == 5) {
        wmt_page.mana.percent = +manaVars[0];
        wmt_page.mana.restoreSpeed = +manaVars[1] * 1000;
        wmt_page.mana.amount = +manaVars[2];
    }

    var isRed = function (color) {
        return color == 'rgb(255, 0, 0)' || color == '#ff0000';
    }

    var notifiersReg = [
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
        wmt_page.time = n[1];
        wmt_page.online = n[2];
    }

    var re = /(\d+(?:,\d{3})*)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/;
    var m = re.exec(text);
    if (m) {
        wmt_page.havingResources = true;
        wmt_page.resources.gold = m[1];
        wmt_page.resources.wood = m[2];
        wmt_page.resources.ore = m[3];
        wmt_page.resources.mercury = m[4];
        wmt_page.resources.sulphur = m[5];
        wmt_page.resources.crystal = m[6];
        wmt_page.resources.gem = m[7];
        wmt_page.resources.diamond = m[8];
    }

    var fr = menuRange.cloneContents();
    var t = fr.firstElementChild;
    var imgs = t.getElementsByTagName('img');
    for (var ii = 0; ii < imgs.length; ii++) {
        var src = imgs[ii].src;
        if (~src.indexOf('gold')) {
            wmt_page.images.gold = src;
        }
        else if (~src.indexOf('wood')) {
            wmt_page.images.wood = src;
        }
        else if (~src.indexOf('ore')) {
            wmt_page.images.ore = src;
        }
        else if (~src.indexOf('mercury')) {
            wmt_page.images.mercury = src;
        }
        else if (~src.indexOf('sulphur')) {
            wmt_page.images.sulphur = src;
        }
        else if (~src.indexOf('crystal')) {
            wmt_page.images.crystal = src;
        }
        else if (~src.indexOf('gem')) {
            wmt_page.images.gem = src;
        }
        else if (~src.indexOf('diamond')) {
            wmt_page.images.diamond = src;
        }
    }

    wmt_page.notifiers = [];
    var as = t.getElementsByTagName('a');
    for (var ii = 0; ii < as.length; ii++) {
        var a = as[ii];

        var href = a.href;
        if (/home\.php/.test(href)) {
            if (isRed(a.style.color)) {
                wmt_page.inBattle = true;
            }
        }

        var img = a.firstChild;
        if (img && img.tagName == 'IMG') {
            for (var jj = 0; jj < notifiersReg.length; jj++) {
                var nReg = notifiersReg[jj];
                if (nReg.Href.test(href) && nReg.Src.test(img.src)) {
                    wmt_page.notifiers.push({ Href: href, Src: img.src, Title: img.title, Class: nReg.Class });
                    break;
                }
            }
        }
    }
};

/*Предметы аукциона с категориями*/
function wmt_auc_items (){}
wmt_auc_items.prototype = {
	/*Все предметы по категориям*/
	all: undefined,
	/*Количество предметов*/
	count: undefined,
	/*Время последнего обновления*/
	lastUpdate: undefined,
	/*Требуется обновление*/
	needUpdate: function(len){
		return len && (len != this.count
			|| !this.lastUpdate
			|| (getCurrentTime() - this.lastUpdate) > 432E5);
	},
	/*Возврашает категорию предмета по его ID*/
	getCategory: function(id){		
		for (var category in this.all){
			for (var ii = 0; ii < this.all[category].length; ii++){
				if (this.all[category][ii] == id){
					return category;
				}
			}
		}
	},	
	getStorageKey: function() {
		return 'wmt_auc_items';
	},
	update: function(){
		Storage.update(this)
	},
	store: function() {
		Storage.store(this);
	},
}


/*Очередь запросов к серверу*/
function RequestQueye() {
    /*Идентификатор очереди для блокировок*/
    this.id = getCurrentTime();
    /*Массив запросов*/
    this.requests = [];
    /*ключ блокировки запросов*/
    this.lockKey = 'RequestLock';
    /*Идет ожидание запросов или исполнение очереди*/
    this._executing = false;
    this._DelayMin = 1000;
    this._DelayDeflection = 1000;
}
/*Добавляет новый запрос в очередь
@param {Object} requestDetails Параметры запроса GM_xmlhttpRequest
*/
RequestQueye.prototype.Add = function (requestDetails) {
    this.requests.push(requestDetails);
    if (!this._executing) {
        this.WaitNewRequest();
    }
}
/*Ожидает наполнение очереди запросов*/
RequestQueye.prototype.WaitNewRequest = function () {
    if (this.requests.length > 0) {
        this.WaitLock();
    }
    else {
        var thisClosure = this;
        setTimeout(function () {
            thisClosure.WaitNewRequest();
        }, 500);
    }
}
/*Ожидает получение блокировки и начинает отправку запросов*/
RequestQueye.prototype.WaitLock = function () {
    //пока не ожидает
    this.Work();
}
/*Освобождает блокировку и начинает ожидание новых запросов*/
RequestQueye.prototype.ReleaseLock = function () {
    //пока не разблокирует
    this.WaitNewRequest();
}
/*Выполняет очередь запросов*/
RequestQueye.prototype.Work = function () {
    this.requests = [];
    var workArray = this.requests;
    var delay = 1;
    for (var ii = 0; ii < workArray.length; ii++) {
        var getRequest = function (index) { return workArray[index]; }
        setTimeout(function () {
            GM_xmlhttpRequest(getRequest(ii));
        }, delay);
        delay += this._DelayMin + Math.round(Math.random() * this._DelayDeflection);
    }
    var closureThis = this;
    setTimeout(function () { closureThis.ReleaseLock(); }, delay);
}

function createMercenaryAutopilot(url, text) {
	if (!text) text = 'Переход через';
	var robot = new wmt_automate('Автопилот', text, 5000,
	 function() { location.assign(url); })
	 robot.switcher.input.checked = OwnInfo.Mercenary.Autopilot;
	 robot.switcher.input.addEventListener('change', function() {
	 	OwnInfo.update();
		OwnInfo.Mercenary.Autopilot = this.checked;
		OwnInfo.store();
		if (this.checked) {
			robot.start();
		}
	 });
	return robot;
}

//Робот - выполняет автоматическое действие с задержкой и возможностью приостановки. Обладает собственным выключателем.
function wmt_automate(switcherText, countdownText, delay, action) {
	var t = this;
	t.delay = delay;
	t.action = action;
	t.switcher = createCheckBoxWithText(switcherText);
	t.switcher.style.verticalAlign = 'middle';
	
	t.countdownSpan = createElement('span');
	t.countdownSpan.style.verticalAlign = 'middle';
	t.countdownSpan.style.display = 'none';
	t.countdownSpan.appendChild(createTextNode(countdownText));
	t.countdownTimeRemainB = createElement('b');
	t.countdownTimeRemainB.style.margin = "0px 4px";
	t.countdownSpan.appendChild(t.countdownTimeRemainB);
	t.countdownSpan.appendChild(createTextNode(' сек.'));
	
	t.countdownCancelButton = createElement('input');
	t.countdownCancelButton.style.verticalAlign = 'middle';
	t.countdownCancelButton.style.display = 'none';
	t.countdownCancelButton.type = 'button';
	t.countdownCancelButton.value = 'Отмена';
	t.countdownCancelButton.addEventListener('click', function() { t.stop()	});
		
	t.root = createElement('div');
	t.root.appendChild(t.switcher);
	t.root.appendChild(t.countdownSpan);
	t.root.appendChild(t.countdownCancelButton);
}
wmt_automate.prototype = {
	startTime: undefined,
	delay: undefined,
	root: undefined,
	switcher: undefined,
	countdownSpan: undefined,
	countdownTimeRemainB: undefined,
	countdownCancelButton: undefined,	
	action: undefined,	
	canStart: undefined,
	_hideElem: function(el) {
		if (el) {
			el.style.display = 'none';
		}
	},
	_showElem: function(el) {
		if (el) {
			el.style.display = '';
		}
	},
	start: function() {
		if (!this.canStart) {
			return;
		}
		this.startTime = getCurrentTime();
		this._hideElem(this.switcher);
		this._showElem(this.countdownSpan);
		this._showElem(this.countdownCancelButton);		
		this.countdown(); 
	},
	countdownId: undefined,
	countdown: function() {
		var t = this;
		let tr  = Math.floor((t.delay - (getCurrentTime() - t.startTime)) / 1000);
		t.countdownTimeRemainB.innerHTML = tr;
		if (tr > 0) {
			t.countdownId = setTimeout(function(){ t.countdown() }, 500);			
		} 
		else {			
			if (t.action) {
				t.action();
			}
			t.stop();		
		}
	},
	stop: function() {
		clearTimeout(this.countdownId);		
		this._hideElem(this.countdownSpan);
		this._hideElem(this.countdownCancelButton);
		this._showElem(this.switcher);		
	}
}

/*Звуковые эффекты*/
function wmt_Sound() {}
wmt_Sound.playMorse = function (text) {
    if (!wmt_page.isActive) {
        return;
    }
    log(location.href + ': ' + text);
    var codes = {
        1: '.----',
        2: '..---',
        3: '...--',
        4: '....-',
        5: '.....',
        6: '-....',
        7: '--...',
        8: '---..',
        9: '----.',
        0: '-----',
        a: '.-',
        b: '-...',
        c: '-.-.',
        d: '-..',
        e: '.',
        f: '..-.',
        g: '--.',
        h: '....',
        i: '..',
        j: '.---',
        k: '-.-',
        l: '.-..',
        m: '--',
        n: '-.',
        o: '---',
        p: '.--.',
        q: '--.-',
        r: '.-.',
        s: '...',
        t: '-',
        u: '..-',
        v: '...-',
        w: '.--',
        x: '-..-',
        y: '-.--',
        z: '--..'
    };
    var f = 750;
    var unit = 75;

    var context = new (window.AudioContext || window.webkitAudioContext)();

    var gainNode = context.createGain();
    gainNode.connect(context.destination);
    gainNode.gain.value = Settings.soundGainValue;

    var start, prevNode;

    var addOscillatorNode = function (d, g) {
        var node = context.createOscillator()
        node.connect(gainNode);
        node.type = 'square';
        node.frequency.value = f;
        if (g != undefined) {
            node.frequency.value = 0;
        }
        var run = function (n) { return function () { n.start(); setTimeout(function () { n.stop(); }, d); } };
        if (prevNode) {
            prevNode.onended = run(node);
        }
        else {
            start = run(node);
        }
        prevNode = node;
    };

    for (var ii = 0; ii < text.length; ii++)
    {
        if (text[ii] == ' ') {
            addOscillatorNode(unit * 7, 0);
        }
        else {
            var code = codes[text[ii]];
            if (code) {
                for (var jj = 0; jj < code.length; jj++) {
                    var dur = unit;
                    if (code[jj] != '.') {
                        dur *= 3;
                    }

                    addOscillatorNode(dur);
                    if (jj < code.length - 1) {
                        addOscillatorNode(unit, 0);
                    }
                }
                addOscillatorNode(unit * 3, 0);
            }
        }        
    }

    if (start) {
        start();
    }
}
wmt_Sound.playSequence = function(notation) {
    var frequency = {
        'P': 0,
        'C': 261.63,
        'C#': 277.18,
        'D': 293.66,
        'D#': 311.13,
        'E': 329.63,
        'F': 349.23,
        'F#': 369.99,
        'G': 392.00,
        'G#': 415.30,
        'A': 440.00,
        'B': 466.16,
        'H': 493.88,
        'C2': 523.25,
        'C#2': 554.36,
        'D2': 587.32,
        'D#2': 622.26,
        'E2': 659.26,
        'F2': 698.46,
        'F#2': 739.98,
        'G2': 784.00,
        'G#2': 830.60,
        'A2': 880.00,
        'B2': 932.32,
        'H2': 987.75
    };
    

    var getNote = function (str) {
        var result = {
            duration: 300
        };
        var pp = str.trim().split(' ');
        result.frequency = frequency[pp[0]];
        if (pp.length > 1)
        {
            result.duration = +pp[1];
        }
        if (pp.length > 2) {
            result.gain = +pp[2];
        }
        return result;
    }

    var arr = notation.split(',');
    var delay = 1;
    for (var ii = 0; ii < arr.length; ii++) {
        var note = getNote(arr[ii]);        
        if (note.frequency > 0)
        {
            wmt_Sound.beep(note.frequency, delay, note.duration, note.gain);
        }
        delay += note.duration;
    }

}
wmt_Sound.beep = function(frequency, delay, duration, gain) {
    var context = new (window.AudioContext || window.webkitAudioContext)();
    var gainNode = context.createGain();
    gainNode.connect(context.destination);
    if (gain == undefined) {
        if (Settings.soundGainValue) {
            gain = Settings.soundGainValue;
        }
        else {
            gain = 0;
        }
    }
    gainNode.gain.value = gain;
    var osc = context.createOscillator();
    osc.connect(gainNode);
    osc.type = 'square';
    if (frequency == undefined) {
        frequency = 350;
    }
    osc.frequency.value = frequency;
    if (delay == undefined) {
        delay = 1;
    }
    if (duration == undefined) {
        duration = 200;
    }
    setTimeout(function() {
        osc.start();
        setTimeout(function () { osc.stop(); }, duration);
    }, delay); 
    
    return osc;
}

//Прикладные методы
function decodeCP1251(s) {
    return s.replace(/%([0-9A-F]{2})/gi, function (m) {
        var c = parseInt(m.substring(1), 16);
        if (c >= 0xC0 && c <= 0xFF) {            
            return String.fromCharCode(0x350 + c);
        }
        else if (c == 0xB8) {            
            return String.fromCharCode(0x451);//'ё';
        }
        else if (c ==0xA8) {
            return String.fromCharCode(0x401);//'Ё';
        }
        else {            
            return decodeURIComponent(m);
        }
    })    
}

/*document.createElement*/
function createElement(tagName, className) {
    var result = document.createElement(tagName);
    if (className) {
        result.className = className;
    }
    return result;
}

function insertAfter(node, target) {
    if (target && target.parentNode) {
        if (target.nextSibling) {
            target.parentNode.insertBefore(node, target.nextSibling);
        }
        else {
            target.parentNode.appendChild(node);
        }
    }
}

/*document.createTextNode*/
function createTextNode(data) {
    return document.createTextNode(data);
}

function createInputWithText(inputType, spanText, inputBeforeSpan) {
	var input = createElement('input');
	input.type = inputType;
	input.style.verticalAlign = 'middle';
	var span = createElement('span');
	span.style.verticalAlign = 'middle';
	span.innerHTML = spanText;
	var label = createElement('label');
	label.input = input;
	label.span = span;
	label.style.whiteSpace = 'nowrap';
	label.appendChild(span);
	if (inputBeforeSpan) {
		label.insertBefore(input, span);
	}
	else {
		label.appendChild(input);
	}
	return label;
}

function createCheckBoxWithText(text) {
	return createInputWithText('checkbox', text, false);
}


/*GM_addStyle*/
function addStyle(style) {
    GM_addStyle(style);
}

/*GM_log*/
function log(message) {
    if (Settings.allowLog == false) {
        return;
    }
    if (!message) {
        message = 'undefined message';
    }
    GM_log(message);
}

/*Возвращает ссылку для покупки предмета на рынке*/
function getArtAucHref(artId, category){	
	return '/auction.php?cat=' + category + '&sort=204&type=0&art_type=' + artId;
}

/*Возвращает прочность предмета ( текущую и максимальную) записанную во всплывающей подсказке*/
function getItemDurability (rootNode) {
    var im = rootNode.querySelector('img[title*="Прочность"]');
    if (im) {
        var m = /(\d+)\/(\d+)/.exec(im.title);
        if (m) {
            return { cur: +m[1], max: +m[2] };
        }
    }
}

/*Вырезает из текстового представления указанного узла первое число, с запятой в качестве разделителя разрядов*/
function getNumber (rootNode) {
    var m = /[\d,]+/.exec(rootNode.textContent);
    if (m) {
        return +(m[0].replace(/,/g, ''))
    };
}

/*Возвращает модифицированную строку модификаторов в названии предмета*/
function getItemModReplacement(m) {
    var reg = /[EWAFIN](\d+)/g;
    var mods = [];
    var count = 0;
    var mm;
    while ((mm = reg.exec(m)) != null) {
        mods.push(mm[0]);
        count += (+mm[1]);
    }
    if (mods.length > 0) {
        return '<b>M' + count + '</b><span><em>' + mods.join('</em><em>') + '</em></span>';
    }
    else {
        return m;
    }
}


/*Возвращает дочерний для node swf объект, параметр movie которого содержит movieValueFragment*/
function getFlashObjectByMovie(movieValueFragment, node) {
    if (!movieValueFragment) {
        log('movieValueFragment is undefined');
        return;
    }
    if (!node) {
        node = document;
    }
    var movieParam = node.querySelector('object>param[value*="' + movieValueFragment + '"]');
    if (movieParam) {
        return movieParam.parentNode;
    }
}

/*Возвращает переменные указанного flashObject*/
function getFlashObjectVars(flashObject) {
    if (flashObject) {
        var param = flashObject.querySelector('param[name="FlashVars"]');
        if (param) {
            var str = param.value;
            if (!str) {
                log("param.value undefined");
                return;
            }
            var prefix = 'param=';
            if (str.indexOf(prefix) == 0) {
                str = str.substring(prefix.length);
            }
            return str.split('|');
        }
    }
    else {
        //log('flashObject is undefined');
    }
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

function getNthParentNode(node, level, checkNode) {
    if (node == undefined || level == undefined) {
        return;
    }
    var result = node;
    var ii = 0;
    while (ii < level && result.parentNode) {
        result = result.parentNode;
        ii++;
    }
    if (checkNode != undefined && !checkNode(result)) {
        return;
    }
    return result;
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
        if (location.hostname == option.value) {
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

    hostSelect.addEventListener('change', function () {
        var index = hostSelect.selectedIndex;
        if (index >= 0 && index < hostSelect.options.length) {
            loginForm.action = 'http://' + hostSelect.options[index].value + '/login.php';
        }
    });
}

/*Обновление чата. Эта функция выполняется в глобальном контексте - все другие функции этого скрипта тут недоступны!*/
function wmt_updatechatlines(l) {
	LastUpdate = l;
	if (!top.frames.chat || !top.frames.chatwindow) return;
	var chatbox = top.frames.chatwindow.document.getElementById("chatbox");
	if (!chatbox) return;
	var a = top.frames.chat.document.getElementById("inbox").innerHTML.split("[explode_line]");
	if (a.length > 0) {
		for (var i=0; i < a.length; i++) {
			if (a[i]!="" && a[i] !="\n" && a[i].length > 5) {
				ChatLines[LinesCounter]= '<span class="wmt-chat-option">&#8230;</span>' + a[i];
				LinesCounter=LinesCounter+1;
			}
		}
		if (LinesCounter > LinesLimit) {
			NewCounter = 0; 
			NewChatLines = [];
			for (var i=(LinesCounter-LinesLimit); i<LinesCounter; i++) {
				NewChatLines[NewCounter] = ChatLines[i];
				NewCounter++;
			}
			LinesCounter = NewCounter;
			ChatLines = NewChatLines;
		}		
		
		var ch_html =  '<style>.wmt-chat-helper { display: none; position: absolute; }'
            + '.wmt-chat-helper>span { border-radius: 0.5em; text-align: center; display: inline-block; width: 1.5em; height: 1.5em; cursor: pointer; border: 1px solid black; padding 0.2em; margin: 0.1em; }'
            + '.wmt-chat-helper>span:first-child { background: white; }'
            + '.wmt-chat-row { display: block; margin: 1px; }'
            + '.wmt-chat-row.hidden { opacity: 0.1; }'
            + '.wmt-chat-row.hidden:hover { opacity: 1; }'
            + '.wmt-chat-option { cursor: pointer; margin-right: 0.3em; }'
            + '.wmt-chat-row img { height: 0.5rem; width: 0.5rem; }</style>';
		for (var ii = ChatLines.length - 1; ii >= 0; ii--) {
			ch_html += '<div class="wmt-chat-row">' + ChatLines[ii] + '</div>';
		}
								
		chatbox.innerHTML= ch_html;		

		var helper = document.createElement('div');
		helper.className = 'wmt-chat-helper';
		
		var openInfo = document.createElement('span');
		openInfo.title = 'Открыть страницу персонажа';
		openInfo.innerHTML = '&#10067;';
		openInfo.addEventListener('click', function () {		    
			var win = window.open('http://www.heroeswm.ru/pl_info.php?nick=' + helper.row.author, '_blank');
  			win.focus();
			//top.frames.main.location.assign('http://www.heroeswm.ru/pl_info.php?nick=' + helper.row.author);
		});
		helper.appendChild(openInfo);
		
		var delLine = document.createElement('span');
		delLine.title = 'Игнорировать это сообщение';
		delLine.innerHTML = '&#10060;';
		delLine.style = 'color: red; background: yellow;'
		delLine.addEventListener('click', function() {
			helper.style.display = 'none';
			var isIn;
			for (var ii = 0; ii < wmt_hidden_list.length; ii++) {
				if (wmt_hidden_list[ii] == helper.row.msg_id) {
					wmt_hidden_list[ii] = undefined;
					helper.row.className = 'wmt-chat-row';
					isIn = true;					
					break;
				}
			}
			if (!isIn) {
				wmt_hidden_list.push(helper.row.msg_id);
				helper.row.className += ' hidden';
			}
			sessionStorage.setItem("wmt_chat_deletedLines", wmt_hidden_list.join('|'));
		})
		helper.appendChild(delLine);
		var delAuthor = document.createElement('span');
		delAuthor.title = 'Игнорировать все сообщения этого персонажа';
		delAuthor.innerHTML = '&#10062;';
		delAuthor.style = 'color: white; background: black;'
		delAuthor.addEventListener('click', function() {
			helper.style.display = 'none';			
			var isIn;			 
			for (var ii = 0; ii < wmt_black_list.length; ii++) {
				if (wmt_black_list[ii] === helper.row.author) {
					isIn = true;				
					wmt_black_list[ii] = '';					
					break;
				}
			}
			if (!isIn) {
				wmt_black_list.push(helper.row.author);							
			}
			localStorage.setItem("wmt_chat_blacklist", wmt_black_list.join('|'));
			//setCookie('wmtbl', wmt_black_list.join('|'), { expires: 100000 });
			
			var cb = helper.row.parentNode;
			for (var ii = 0; ii < cb.childNodes.length; ii++) {
				var row = cb.childNodes[ii];
				if (row.author === helper.row.author) {
					row.className = 'wmt-chat-row' + (isIn ? '' : ' hidden');
				}
			}		
		});		
		helper.appendChild(delAuthor);		
		chatbox.appendChild(helper);
		
		var wmt_time = chatbox.querySelectorAll('span.time');
		for (var ii = 0; ii < wmt_time.length; ii++) {
			var row = wmt_time[ii].parentNode; 
			row.author = wmt_time[ii].nextSibling.nextSibling.textContent;
			row.title = row.author;
		    row.msg_id = wmt_time[ii].firstChild.nextSibling.title;
			var option = row.querySelector('.wmt-chat-option');
			if (option) {
				option.addEventListener('click', function() {
					if (helper.style.display != 'inline-block'
					 || !helper.row || helper.row.msg_id != this.parentNode.msg_id) {
					 	helper.row = this.parentNode;
						helper.style.display = 'inline-block';												
						helper.style.top = this.offsetTop;
						helper.style.left = this.offsetWidth;
					}
					else {
						helper.style.display = 'none';
					}
				 });	
			}
			if (wmt_isInArray(wmt_black_list, row.author) || wmt_isInArray(wmt_hidden_list, row.msg_id)) {
				row.className += ' hidden';
			}
			
		}
    }
}

/*Получает куку по имени*/
function getCookie(name) {
    var matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

/*Задает куку*/
function setCookie(name, value, options) {
    options = options || {};

    var expires = options.expires;

    if (typeof expires == "number" && expires) {
        var d = new Date();
        d.setTime(d.getTime() + expires * 1000);
        expires = options.expires = d;
    }
    if (expires && expires.toUTCString) {
        options.expires = expires.toUTCString();
    }

    value = encodeURIComponent(value);

    var updatedCookie = name + "=" + value;

    for (var propName in options) {
        updatedCookie += "; " + propName;
        var propValue = options[propName];
        if (propValue !== true) {
            updatedCookie += "=" + propValue;
        }
    }

    document.cookie = updatedCookie;
}

/*Настройка фрейма чата*/
function setupChat() {
    let ignored = localStorage.getItem('wmt_chat_blacklist');
    if (ignored) {
        ignored = ignored.split('|');
    }
    else {
        ignored = [];
    }
    let hidden = sessionStorage.getItem('wmt_chat_deletedLines');
    if (hidden) {
        hidden = hidden.split('|');
    }
    else {
        hidden = [];
    }

    var script = createElement('script');
    script.innerHTML = 'var wmt_hidden_list = ' + JSON.stringify( hidden) + ';\r\n var wmt_black_list = '+ JSON.stringify(ignored) +
    ';\r\n function wmt_isInArray(array, value) { for (var ii = 0; ii < array.length; ii++) {\
    if (array[ii] === value) return true; }};\r\n' + wmt_updatechatlines.toString() + ';\r\n';
    document.body.appendChild(script);
	window.eval('updatechatlines = wmt_updatechatlines;');	
}

/*Add some chars "c" to the begin of string representative of value "v", if it length less than "l"*/
function padLeft(v, l, c) {
    if (v != undefined && l > 0 && c != undefined) {
        while (v.toString().length < l) {
            v = c + v;
        }
    }
    return v;
}

function getBackgroundDiv() {
    var id = 'wmt_background';
    var result = document.getElementById(id);
    if (!result) {
        addStyle('.wmt-cmn-bgd { display: none; position: fixed; top: 0; left: 0; bottom: 0; right: 0; background-color: #111; opacity: 0.4; }');
        result = createElement('div', 'wmt-cmn-bgd');
        document.body.appendChild(result);
    }
    return result;
}

/*Возвращает элементы главного меню*/
function getMenuItems() {
    var result = [];
    /*home*/
    result.push({
        Title: '\uD83C\uDFE0', Href: 'home.php',
        Items: [
            { Title: wmt_page.nickName, Href: 'pl_info.php?id=' + wmt_page.playerId },
            { Title: '\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438', Href: 'pers_settings.php' },            
            { Title: '\u041A\u0443\u0437\u043D\u044F', Href: 'mod_workbench.php' },                   
            { Title: '\u041F\u043E\u0447\u0442\u0430', Href: 'sms.php' },
            { Title: '\u0420\u0435\u0439\u0442\u0438\u043D\u0433', Href: 'plstats.php' }            
        ]
    });
	/*map*/
    result.push({
        Title: '\uD83C\uDF0F', Href: 'map.php?st=sh', Items: [
                { Title: '\u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430', Href: 'map.php?st=fc' },
                { Title: '\u0414\u043E\u0431\u044B\u0447\u0430', Href: 'map.php?st=mn' },
                { Title: '\u0414\u043E\u043C\u0430', Href: 'map.php?st=hs' },
                { Title: '\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C\u00A0\u043E\u0445\u043E\u0442\u0443', Href: 'map.php?action=skip' },
                { Title: '\u0413\u0438\u043B\u044C\u0434\u0438\u044F\u00A0\u043D\u0430\u0435\u043C\u043D\u0438\u043A\u043E\u0432', Href: 'mercenary_guild.php' },
                { Title: '\u042D\u043A\u043E\u043D\u043E\u043C\u0438\u0447\u0435\u0441\u043A\u0430\u044F\u00A0\u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430', Href: 'ecostat.php' },
                { Title: 'Toggle map', Action: toggleMap },
                { Title: 'ShowTextMap', Action: showTextMap }
        ]
    });	
	/*Castle*/
	result.push({
	    Title: '\uD83C\uDFF0', Href: 'castle.php', Items: [
            { Title: '\u0423\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0435', Href: 'mod_workbench.php' },
            { Title: '\u0420\u0435\u043C\u043E\u043D\u0442', Href: 'mod_workbench.php?type=repair' },
			{ Title: '\u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u044B\u00A0\u0441\u0443\u0449\u0435\u0441\u0442\u0432', Href: 'arts_for_monsters.php' }
		]
	});
	/*Skills*/
	result.push({
		Title: '\u229B', Href: 'skillwheel.php', Items: [] 
	});
	/*Army*/
	result.push({
		Title: '\uD83D\uDC6A', Href: 'army.php', Items: [		
		]
	});
	/*Inventory*/
	result.push({
            Title: '\uD83D\uDC5A', Href: 'inventory.php', Items: [                    
            //Add inventory sets links
            ]
        });
	/*transfer*/
	result.push({
		Title: '\u2696', Href: 'pl_transfers.php?id=' + wmt_page.playerId ,
		Items: [
			{ Title: '\u21D2\u00A0\u0420\u0435\u0441\u0443\u0440\u0441\u044B', Href: 'transfer.php' },
			{ Title: '\u21D2\u00A0\u042D\u043B\u0435\u043C\u0435\u043D\u0442\u044B', Href: 'el_transfer.php' },
		]
	});    
    /*battles*/
    result.push({
        Title: '\u2694', Href: 'pl_warlog.php?id=' + wmt_page.playerId, Items: [
            { Title: '\u0412\u0441\u0435\u00A0\u0431\u043E\u0438', Href: 'bselect.php' },
            { Title: '\u0422\u0443\u0440\u043D\u0438\u0440\u044B', Href: 'tournaments.php' },
            { Title: '\u0413\u0438\u043B\u044C\u0434\u0438\u044F\u00A0\u0442\u0430\u043A\u0442\u0438\u043A\u043E\u0432', Href: 'pvp_guild.php' }
        ]
    });
	/*Shop*/
	result.push({
		Title: '\uD83C\uDFEA', Href: 'shop.php',
		Items: [			
		]
	});
	/*Market*/
    result.push({
		//\uD83D\uDC5C - one bag
        Title: '\uD83C\uDFEC', Href: 'auction.php', Items: [
                { Title: '\u0412\u044B\u0441\u0442\u0430\u0432\u0438\u0442\u044C\u00A0\u043B\u043E\u0442', Href: 'auction_new_lot.php' },
                { Title: '\u0412\u0430\u0448\u0438\u00A0\u0442\u043E\u0432\u0430\u0440\u044B', Href: 'auction.php?cat=my&sort=0' }
        ]
    });
	/*Small games*/
    result.push({
        Title: '\uD83C\uDF7B', Href: 'tavern.php', Items: [
            { Title: '\u041F\u0440\u043E\u0442\u043E\u043A\u043E\u043B\u00A0\u0438\u0433\u0440', Href: 'pl_cardlog.php?id=' + +wmt_page.playerId },
            { Title: 'roulette', Href: 'roulette.php' },
            { Title: '2048', Href: '2048.html' }
        ]
    });
	/*Forum*/
    result.push({
        Title: '\uD83D\uDCAC', Href: 'forum.php', Items: [
                { Title: 'Новости', Href: 'forum_thread.php?id=1' },
                { Title: 'Общий', Href: 'forum_thread.php?id=2' },
                { Title: 'Вопросы', Href: 'forum_thread.php?id=10' },
                { Title: 'Идеи', Href: 'forum_thread.php?id=3' },
                { Title: '\u0427\u0430\u0442', Href: 'frames.php' }
        ]
    });
	/*Help*/
    result.push({
        Title: '\u2754', Href: 'help.php', Items: [
            { Title: '\u041D\u0435\u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u0430\u044F\u00A0\u0441\u043F\u0440\u0430\u0432\u043A\u0430', Href: 'http://help.ordenmira.ru' },
            { Title: '\u0422\u0430\u0431\u043B\u0438\u0446\u044B\u00A0\u043E\u043F\u044B\u0442\u0430', Href: 'help.php?section=10' },
            { Title: '\u041A\u043E\u043B\u0451\u0441\u0430\u00A0\u043D\u0430\u0432\u044B\u043A\u043E\u0432', Href: 'skillwheel_demo.php' }

        ]
    });
    return result;
}

/*Отображает текущую прочность одетых вещей*/
function showItemsCurrentDurability() {
    if (!Settings.showItemsCurrentDurability) {
        return;
    }

    var existing = document.querySelectorAll('.wmt-cmn-icd');
    for (var ii = 0; ii < existing.length; ii++) {
        existing[ii].parentNode.removeChild(existing[ii]);
    }

    addStyle('.wmt-cmn-icd { position: absolute;  color: white; background: rgba(60, 60, 60, 0.5); border-radius: 2px; border-bottom-right-radius: 5px; \
min-width: 1.8em; text-align: center; -moz-user-select: none; user-select: none; }');

    var createDurabilitySpan = function (title) {
        var dm = /(\d+)\/\d+/.exec(title);
        if (dm) {
            var cd = +dm[1];
            var sp = document.createElement('span');
            sp.innerHTML = cd;
            sp.className = 'wmt-cmn-icd';
            if (cd < 4) {
                sp.style.background = 'rgba(225, 5, 0, 0.5)';
            }
            return sp;
        }
    }

    var s = ['table[background*="/i/artifacts/"] tr:first-child img[src*="i/transparent.gif"]', 'img[src*="/i/artifacts/"]'];

    var root = document;
    var slot = document.querySelector('div[id*="slot"]');
    if (slot) {
        root = slot.parentNode.parentNode.parentNode;
    }
    
    for (var ii = 0; ii < s.length; ii++) {
        var img = root.querySelectorAll(s[ii]);
        for (var jj = 0; jj < img.length; jj++) {
            var ds = createDurabilitySpan(img[jj].title);
            if (ds) {
                img[jj].parentNode.insertBefore(ds, img[jj]);
            }
        }
    }


}

/*Возвращает количество миллисекунд прожедших с начала отсчета до момента вызова этой функции*/
function getCurrentTime() {
    return new Date().getTime();
}

/*Заменяет оригинальное меню*/
function insertCustomMainMenu() {
    addStyle('.wmt-head { display: inline-block; margin-left: 3em; width: 97%; }\
.wmt-time { float: right;  margin-right: 10px; font-weight: bold; font-size: 14px; }\
.wmt-resources { display: block;  }\
.wmt-resources img { margin: 2px; }\
.wmt-resources td { vertical-align: middle; }\
.radio { float: right; margin-right: 10px; }\
.radio img { height: 12px; width: 12px; }\
.notify { float: right; margin: 2px; margin-right: 5px; padding: 3px; background: yellow; border: solid 1px; border-radius: 8px; }\
.notify img { height: 16px; width: 16px; vertical-align: middle; }\
.gray { background: lightgray; }\
.hidden { display: none; }\
.wmt-menu { position: fixed; width: 3em; } .inbattle { background-color: tomato; }\
div.menuitem { display: block; position: relative; margin: 1px; font-size: x-large; text-align: center; }\
div.menuitem div.title{ position: relative;	left: 0; top: 0; color: darkgray; }\
div.menuitem a { font-size: inherit; margin-right: 5px; margin-top: 2px; background: inherit; display: inline-block; text-decoration: none; }\
div.menuitem a:hover { color: blue; }\
div.menuitem div.items { padding: 3px; text-align: left; overflow: hidden; height: 0; width: 0; position: absolute; left: 0.9em; top: -1em;\
transition: left 10s linear;}\
div.menuitem:hover div.items { height: inherit; width: inherit; transform: translateY(1.3em); background: lightgray; }\
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
        var menu = createElement('div', 'wmt-menu');
        if (wmt_page.inBattle) {
            menu.className += ' inbattle';
        }
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
        a.href = imageHref;
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

    var createServerTime = function () {
        var hd = 0;
        var ts = ':';

        var el = createElement('span', 'wmt-time');
        el.title = 'Время сервера';        
        if (wmt_page.time) {
            hd = +wmt_page.time.split(ts)[0] - new Date().getHours();
            el.title += ' ' + wmt_page.time;
        }

        var updateTime = function () {
            var n = new Date();
            var h = n.getHours() + hd;
            if (h >= 24) {
                h -= 24;
            }
            var m = n.getMinutes();
            if (m < 10) {
                m = '0' + m;
            }

            var s = n.getSeconds();
            if (s < 10) {
                s = '0' + s;
            }
            el.innerHTML = h + ts + m + ts + s;
            setTimeout(updateTime, 1000);
        }
        updateTime();
        return el;
    }

    var createHead = function () {
        var head = createElement('div', 'wmt-head');
        

        if (wmt_page.time) {
            head.appendChild(createServerTime());
        }

        if (wmt_page.notifiers) {
            for (var ii = 0; ii < wmt_page.notifiers.length; ii++) {
                head.appendChild(createNotify(wmt_page.notifiers[ii]));
            }
        }

        if (wmt_page.havingResources) {
            var rsc = createElement('table', 'wmt-resources');
            var soleRow = createElement('row');
            soleRow.appendChild(createResourceItem(wmt_page.resources.gold, wmt_page.images.gold, 'gold', 'auction.php'));
            soleRow.appendChild(createResourceItem(wmt_page.resources.wood, wmt_page.images.wood, 'wood', 'auction.php?cat=res&sort=0&type=1'));
            soleRow.appendChild(createResourceItem(wmt_page.resources.ore, wmt_page.images.ore, 'ore', 'auction.php?cat=res&sort=0&type=2'));
            soleRow.appendChild(createResourceItem(wmt_page.resources.mercury, wmt_page.images.mercury, 'mercury', 'auction.php?cat=res&sort=0&type=3'));
            soleRow.appendChild(createResourceItem(wmt_page.resources.sulphur, wmt_page.images.sulphur, 'sulphur', 'auction.php?cat=res&sort=0&type=4'));
            soleRow.appendChild(createResourceItem(wmt_page.resources.crystal, wmt_page.images.crystal, 'crystal', 'auction.php?cat=res&sort=0&type=5'));
            soleRow.appendChild(createResourceItem(wmt_page.resources.gem, wmt_page.images.gem, 'gem', 'auction.php?cat=res&sort=0&type=6'));
            soleRow.appendChild(createResourceItem(wmt_page.resources.diamond, wmt_page.images.diamond, 'diamond', 'hwm_donate_page_new.php'));
            rsc.appendChild(soleRow);
            head.appendChild(rsc);
        }

        if (Settings.showTimersAmongMenu) {
            var tp = createElement('div', 'wmt-timer-panel');
            (function () { for (var ii = 0; ii < arguments.length; ii++) { arguments[ii].appendTo(tp); } })
            (Timer.getWork(), Timer.getHunt(), Timer.getMercenary(), Timer.getThief(), Timer.getMovement(), Timer.getHP(), Timer.getMana(), Timer.getOwn(), Timer.getOwn2());
            head.appendChild(tp);
        }
        return head;
    }

    var fc = document.body.querySelector('center');
    if (fc) {
        fc.parentNode.insertBefore(createMenu(), fc);
        fc.parentNode.insertBefore(createHead(), fc);
        fc.style = 'margin-left: 3em; display: inline-block;';
        
    }

    var sourceMenuTable = document.querySelector('body>table');
    if (sourceMenuTable) {
        sourceMenuTable.parentNode.removeChild(sourceMenuTable);
    }
}

/*Инициализация общих стилей */
function initializeCommonStyles() {
    /*Таймеры*/
    if (Settings.showTimersAmongMenu) {
        addStyle('.wmt-timer-panel {  }\
.wmt-timer-panel .wmt-guild-timer { display: inline-block; }  .wmt-timer-panel .wmt-gt-time { color: #006400; }\
.wmt-guild-timer { cursor:pointer; display: inline-block; padding: 3px; margin-right: 5px; }\
.wmt-gt-title { margin-right: 5px; color: #455D63; font-size: x-large; display:inline-block; min-width: 1em; }\
.wmt-gt-flicker-off { visibility: hidden; }\
.wmt-gt-flicker-on { vertical-align: super; }\
.wmt-gt-time { font-weight: bold; vertical-align: super; }');
    }
    /*Ссылка на бой*/
    addStyle('.wmt-battle-link { padding: 2px; vertical-align: middle; display: inline; }\
.wmt-battle-link span { color: darkred; font-size: larger; display: inline-block; font-weight: bold; }\
.wmt-battle-link a { display: inline-block; position: relative; top: -2px; }\
.wmt-battle-link a.wmt-battle-result { color: green !important; font-size: larger; text-decoration: none; }\
.wmt-battle-link a.wmt-battle-chat { text-decoration: none; }');
    //Ссылка для перемещения
    addStyle('.wmt-direct-move { margin-left: 0.2em; font-size: 25px; text-decoration: none; display: inline-block; border-radius: 0.5em; font-weight: initial }\
.wmt-direct-move:hover { background: whitesmoke; }');

    //Текстовая карта
    addStyle('.wmt-map-window {  }\
.wmt-map-window>button { float: right; }\
.wmt-map-table { border-collapse: collapse; border: 1px solid silver; width: 18rem; }\
.wmt-map-table tr { height: 3rem; }\
.wmt-map-table td { border-radius: 3px; text-align: center;  }\
.wmt-map-empty-cell {  background: #ddd9cd; }\
.wmt-map-sector-cell { background: white; }\
.wmt-map-view-link {  text-decoration: none; }\
.wmt-map-move-link { padding-left: 0.5em; font-size: larger; text-decoration: none; }');
}

/*Переключатель видимости карты*/
function toggleMap() {
    var newDisplay = Settings.hideMap ? '' : 'none';
    Settings.hideMap = !Settings.hideMap;
    Settings.store();
    let mapObj = setMapObjectDisplay(newDisplay);
    if (Settings.hideMap) {

        mapObj.parentNode.appendChild(getTextMap());
    }
}

/*Создает и показывает текстовую карту мира*/
function showTextMap() {
    document.body.appendChild(getTextMap());
}

function getTextMap() {
    var mapDiv = document.createElement('div');
    mapDiv.className = 'wmt-map-window';
    /*var closeBtn = document.createElement('button');
    closeBtn.appendChild(document.createTextNode('X'));
    closeBtn.addEventListener('click', function () { document.body.removeChild(mapDiv) });
    mapDiv.appendChild(closeBtn);*/

    var minSectorX = 50;
    var maxSectorX = 50;
    var minSectorY = 50;
    var maxSectorY = 50;

    /*let mapSectorRadiuses = [];
    Map.forEachConcentric({ sectorId: 26, handleSector: (d) => mapSectorRadiuses.push(d) });
    let mapSectorRadusColors = ['green', 'lime', 'yellow', 'orange', 'red', 'brown'];*/

    for (var ii = 0; ii < Map.sectors.length; ii++) {
        var sect = Map.sectors[ii];
        if (sect.x > maxSectorX) {
            maxSectorX = sect.x;
        }
        if (sect.x < minSectorX) {
            minSectorX = sect.x;
        }
        if (sect.y > maxSectorY) {
            maxSectorY = sect.y;
        }
        if (sect.y < minSectorY) {
            minSectorY = sect.y;
        }
    }

    var columnCount = maxSectorX - minSectorX + 1;
    var rowCount = maxSectorY - minSectorY + 1;

    let getSectorAbb = (name) => {
        let words = name.split(' ');
        let result = '';
        for (let ii = 0; ii < words.length; ii++) {
            result += words[ii][0].toUpperCase();
        }
        return result;
    }

    var mapTable = document.createElement('table');
    mapTable.className = 'wmt-map-table';
    for (var rowIndex = minSectorY; rowIndex <= maxSectorY; rowIndex++) {
        var row = mapTable.insertRow(mapTable.rows.length);
        for (var columnIndex = minSectorX; columnIndex <= maxSectorX; columnIndex++) {
            var cell = row.insertCell(row.cells.length);
            var sector = Map.getSectorByCoordinates(columnIndex, rowIndex);
            if (sector) {
                cell.className = 'wmt-map-sector-cell';
                var sectorEl = document.createElement('a');
                sectorEl.className = 'wmt-map-view-link';
                sectorEl.title = 'Обзор сектора ' + sector.name;
                sectorEl.href = '/map.php?cx=' + sector.x + '&cy=' + sector.y;
                sectorEl.innerHTML = /*'\uD83D\uDD0D' + */getSectorAbb(sector.name) ;
                cell.appendChild(sectorEl);
                insertMoveLink(sectorEl);

                /*for (let ii = 0; ii < mapSectorRadiuses.length; ii++) {
                    if (mapSectorRadiuses[ii].sector.x == sector.x
                        && mapSectorRadiuses[ii].sector.y == sector.y) {
                        if (mapSectorRadiuses[ii].radius < mapSectorRadusColors.length) {
                            sectorEl.style = 'border-bottom: 5px solid '
                                + mapSectorRadusColors[mapSectorRadiuses[ii].radius];
                        }
                        break;
                    }
                }*/
            }
            else {
                cell.className = 'wmt-map-empty-cell';
            }

        }
    }

    mapDiv.appendChild(mapTable);
    return mapDiv;
}

/*Устанавливает свойству display элемента карты мира указанное значение */
function setMapObjectDisplay(value) {
    var mapObj = getFlashObjectByMovie('map.swf');;
    if (mapObj) {
        mapObj.parentNode.style.display = value;
        /*var parent = mapObj.parentNode;
        while (parent) {
            if (parent && parent.nodeName.toLowerCase() == 'table' && (parent.width == "100" || parent.width == "50")) {
                parent.style.display = value;
            }
            parent = parent.parentNode;
        }*/
    }
    return mapObj;
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
    var m = /pl_info\.php\?id=(\d+)/.exec(href);
    if (m) {
        return m[1];
    }
}

/*Обновляет данные для таймера перемещения из flash объекта*/
function updateMoveTimer() {
    var v = getFlashObjectVars(getFlashObjectByMovie('map.swf'));
    if (!v || !v.length) {
        return false;
    }

    var f = v[0].split(':');
    if (f.length != 18) {
        return false;
    }

    OwnInfo.Movement.Time = getCurrentTime();
    OwnInfo.Movement.Interval = (+f[15]) * 1000;
    return true;
}

/*Обновляет информацию по объекту*/
function updateObjectInfoRow(objInfo) {
    var row = document.querySelector('tr#wmt_object_info_row_' + objInfo.id);
    if (row) {

        var cn = [];
        if (objInfo._class > 0) {            
            cn.push('wmt-map-orr');            
        }
        else {            
            cn.push('wmt-map-orp');
        }
        if (objInfo.canSellResources) {
            cn.push('wmt-map-ors');
        }

        if (objInfo.id == OwnInfo.LastWork.ObjectId && Timer.getWork().isRunning()) {
            cn.push('wmt-map-orc');
        }
        row.className = cn.join(" ");

        if (objInfo.salary != undefined) {
            row.cells[1].innerHTML = getRealSalary(objInfo.salary);
        }
        else {
            row.cells[1].innerHTML = '-'
        }

        if (objInfo.balance >= 0) {
            row.cells[2].innerHTML = getBalanceShort(objInfo.balance);
            row.cells[2].title = objInfo._class;
        }
        else {
            row.cells[2].innerHTML = '-';
        }

        if (objInfo.workShiftEnd) {
            row.cells[3].title = objInfo.workShiftEnd;
            row.cells[3].innerHTML = getShiftEndElapse(objInfo.workShiftEnd) + '\u2032';
        }
        else {
            row.cells[3].innerHTML = '\u221E';
        }

        if (objInfo.freeWorkPlaceCount > 0) {
            row.cells[4].innerHTML = objInfo.freeWorkPlaceCount;
        }
        else {
            row.cells[4].innerHTML = '-';
        }
        row.cells[4].title = objInfo.useWorkPlaceCount;

        var updateBt = row.querySelector('div.wmt-update-object-button');
        if (updateBt) {
            updateBt.className = 'wmt-update-object-button wmt-update-object-button-normal';
        }
    }
}

function parseXmlDoc(text) {
    var parser = new DOMParser();
    return parser.parseFromString(text, 'text/html');
}

/*Обработка ответа на запрос информации об объекте*/
function handleObjectInfoResponse(response) {
    if (response.status == "200" && response.readyState == 4) {
        var objId = getObjectId(response.finalUrl);
        if (objId) {
            var xmlDoc = parseXmlDoc(response.responseText);			
            if (xmlDoc) {
                wmt_ph.processObjectInfo(xmlDoc, objId);
                var objInfo = new ObjectInfo(objId);
                objInfo.update();
                updateObjectInfoRow(objInfo);
            }
        }
    }
}

/*Создает ссылку на сектор */
function createSectorNameLink(sector) {
	var sectorLink = createElement('a');
    sectorLink.appendChild(createTextNode(sector.name));
    sectorLink.href = '/map.php?cx=' + sector.x + '&cy=' + sector.y;
    sectorLink.title = 'Переместиться в сектор ' + sector.name + '. (Нужен транспорт со сложным маршрутом)';
    return sectorLink;
}

/*Создает ссылку для перехода в указанный сектор*/
function createMoveSectorLink(sector) {
    var moveLink = createElement('a', 'wmt-direct-move');
    moveLink.appendChild(createTextNode('\u2658')); //'\u265E' black edition
    moveLink.href = '/move_sector.php?id=' + sector.id;
    moveLink.title = 'Переместиться в сектор ' + sector.name + '. (Нужен транспорт со сложным маршрутом)';
    return moveLink;
}

/*Добавляет ссылку для перехода после указанной ссылки на сектор карты*/
function insertMoveLink(mapLink) {
    if (mapLink && OwnInfo.premiumEnabled) {
        var sector = Map.getSectorByHref(mapLink.href);
        if (sector) {
            if (mapLink.nextSibling) {
                mapLink.parentNode.insertBefore(createMoveSectorLink(sector), mapLink.nextSibling);
            }
            else if (mapLink.parentNode) {
                mapLink.parentNode.appendChild(createMoveSectorLink(sector));
            }
            else {
                log('map link has not have parentNode');
            }
        }
        else {
            log('Sector not found: ' + mapLink.href);
        }
    }
}

/*Возвращает зарплату с учетом эффективности ГР и штрафа трудоголика*/
function getRealSalary(salaryBase) {
    return Math.floor((+salaryBase) * OwnInfo.WorkEfficiencyFactor * OwnInfo.WorkaholicPenaltyFactor * OwnInfo.workEfficiencyBonusFactor);
}

/*Возвращает время до конца смены в минутах*/
function getShiftEndElapse(value) {
    var cm = new Date().getMinutes();
    var m = +value.split(':')[1];
    var result = m - cm;
    if (result <= 0) {
        result += 60;
    }
    return result;
}

function getBalanceShort(value) {
    var ms = ['', 'k', 'M', 'G'];
    var ind = 0;
    var b = 1000;
    while ((ind < ms.length - 1) && (value  > b)) {
        value /= b;
        ind++;
    }
    if (ind > 0) {
        return value.toFixed(1) + ms[ind];       
    }
    else {
        return value;
    }
}

function createNumberDiv(value) {
    var vl = value.toFixed(0).toString();    
    var container = createElement('div', 'wmt-nc');    
    for (var ii = 0; ii < vl.length; ii++) {
        var num = createElement('img', 'wmt-ni');
        num.src = 'http://hwm.cdnvideo.ru/i/mon_pic_png/nums/2x' + vl[ii] + '.png';
        container.appendChild(num);
    }
    return container;
}

function createGoldImg() {
    var result = createElement('img');
    result.src = wmt_page.images.gold;
    result.height = 18;
    return result;
}

function createCraftElementImg(elIndex) {
	var result = createElement('img');
	result.src = 'http://dcdn.heroeswm.ru/i/' + craft_elements[elIndex][1] + '.gif';
	result.title = craft_elements[elIndex][0];
    return result;
}

function getSeparatedValue(v) {
    if (v) {
        var res = '';
        var arr = v.toString().split('.');
        if (arr[0].length > 3) {
            for (var ii = arr[0].length - 1, n = 1; ii >= 0; ii--, n++) {
                res = arr[0][ii] + res;
                if (n == 3 && ii > 0) {
                    res = ',' + res;
                    n = 0;
                }
            }
        }
        else {
            res = arr[0];
        }
        
        if (arr.length > 1) {
            res += '.' + arr[1];
        }
        return res;
    }
}

function getResourcesPrice(t) {
    var r = {};
    if (t && t.rows && (t.rows.length == 1)
        && ((t.rows[0].cells.length % 2) == 0)) {
        for (var ii = 0; ii < t.rows[0].cells.length; ii += 2) {
            var img = t.rows[0].cells[ii].firstChild.src.split(/[\/.]/);
            r[img[img.length - 2]] = parseInt(t.rows[0].cells[ii + 1].textContent.replace(/,/g, ''));
        }
    }    
    return r;
}

function getTotalPrice(p) {
    var result = 0;
    for (var r in p) {
		if (r) {
			result += p[r] * getPriceMultiplier(r);	
		}        
    }
    return result;
}

function getPriceMultiplier(r) {
    switch (r) {
        case 'gold':
            return 1;
        case 'wood':
        case 'ore':
            return 180;
        case 'mercury':
        case 'sulfur':
        case 'crystal':
        case 'gem':
            return 360;
        default:
            log('Unexpected resource code: ' + r);
            return 0;
    }
}

/*Извлекает идентификатор объекта из ссылки на его страницу*/
function getObjectId(href) {
    var match = /object-info\.php\?id=(\d+)/.exec(href);
    if (match) {
        return match[1];
    }
}

function getRaceImg(node) {
    if (node && node.querySelector) {
        return node.querySelector(
'table.wblight b>img[src*="i/r"][title][width="15"][height="15"][align="absmiddle"]');
    }
    else {
        log('Incorrect race img root node');
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
        }
        else {
            log('Selector "div#mod_guild" has not result');
        }
    }
}

/*Создает комплексную ссылку на бой*/
function createBattleLink(warId, text, sfa) {
    if (!sfa) {
        sfa = '';
    }
    var cLink = createElement('a', 'wmt-battle-chat');
    cLink.href = '/battlechat.php?warid=' + warId/* + sfa*/;    //тут sfa пока не трэба
    //\uD83D\uDCAC 
    cLink.appendChild(createTextNode('\ud83c\udfb6'));
    cLink.title = 'Запись переговоров';
    cLink.target = '_blank';

    var sLink = createElement('a', '');
    sLink.href = '/warlog.php?lt=-1&warid=' + warId + sfa;
    sLink.appendChild(createTextNode('#' + warId));
    sLink.title = 'Смотреть c начала';
    sLink.target = '_blank';

    var rLink = createElement('a', 'wmt-battle-result');
    rLink.href = '/battle.php?lastturn=-1&warid=' + warId + sfa;
    rLink.appendChild(createTextNode("\uD83C\uDFC6"));
    rLink.title = 'Показать результаты';
    rLink.target = '_blank';

    var cpt = createElement('span');
    cpt.appendChild(createTextNode('\u2694'));
    //cpt.appendChild(createTextNode('\ud83d\udc4a'));

    var gr = createElement('div', 'wmt-battle-link');
    gr.appendChild(cpt);
    gr.appendChild(sLink);
    gr.appendChild(rLink);
    gr.appendChild(cLink);

    return gr;
}

function splitChildrens(node, isSplitNode) {
    if (node && isSplitNode) {
        var result = [];
        var fr = [];
        for (var ii = 0; ii < node.childNodes.length; ii++) {
            var child = node.childNodes[ii];
            if (isSplitNode(child)) {
                result.push(fr);
                fr = [];
            }
            else {
                fr.push(child);
            }
        }
        return result;
    }
    else {
        log("Undefined splitChildrens argument");
    }
}

/*Возвращает параметр warid из ссылки на бой или его результаты или его сообщения*/
function getWarId(href) {
    if (href) {
        var m = /warid=(\d+)/.exec(href);
        if (m) {
            return m[1];
        }
    }
}

/*Возвращает параметр show_for_all*/
function getShowForAll(href) {
    if (href) {
        var m = /&show_for_all=\w+/.exec(href);
        if (m) {
            return m[0];
        }
    }
}

function getWarDate(str) {
    if (str) {
        var m = /(\d{2})-(\d{2})-(\d{2})\s(\d{2}:\d{2})/.exec(str);
        if (m) {
            return {
                Day: m[1],
                Month: m[2],
                Year: m[3],
                Time: m[4]
            };
        }
    }
}

function getMonthName(monthNum) {
	var monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    var num = +monthNum;
    if (num && num > 0 && num <= monthNames.length) {
        return monthNames[--num];
    }
    else {
        log('Invalid parameter value "monthNum": ' + monthNum);
        return monthNum;
    }
}

function setupMySelfLink(link) {
    if (link && ~link.href.indexOf('pl_info.php?id=' + wmt_page.playerId)) {
        var levelM = /\[(\d+)\]/.exec(link.textContent);
        while (link.firstChild) {
            link.removeChild(link.firstChild);
        }
        //link.style.fontSize = 'large';
        link.className += " wmt-self-link";
        link.appendChild(createTextNode("Я"));//\u2C00
        if (levelM) {
            var levelEl = createElement('kbd', 'wmt-self-link-level');
            levelEl.appendChild(createTextNode(levelM[0]));
            link.appendChild(levelEl);
        }

    }
}

function addSelfLinkClasses() {
    addStyle('.wmt-self-link {  }\
.wmt-self-link-level { display: none; }\
.wmt-self-link:hover .wmt-self-link-level { display: inline; }');
}

/*Получает ник из ссылки в чате*/
function getChatNick(chatNick) {
    let match = /javascript:void\(top\.sendto\('([^']+)'\)\)/.exec(chatNick);
    if (match && match[1]) {
        return decodeURIComponent(match[1]);
    }
}

function getArtifactId(href) {
    var m = /art_info\.php\?id=(\w+)/.exec(href) || /ecostat_details\.php\?r=(\w+)/.exec(href);
    if (m) {
        return m[1];
    }
    else {
        log('Artifact id is not found: ' + href);
    }
}

function getBattleResults(src) {
    var em;
    if (src && (em = /\|\#f_en(Victorious:[^\|]+)\|/.exec(src)) != null) {
        return em[1];
    }
}

/*Возвращает результат проверки регулярки*/
function getMatch(regExp, sourceString) {
	if (sourceString && regExp) {
		return regExp.exec(sourceString);
	}
}

/*Возвращает первое полученное значение результата проверки регулярки*/
function getNthMatch(regExp, sourceString, matchNum){
	var m = getMatch(regExp, sourceString);
	if (m) {
		return m[matchNum];
	}	
}

function wmt_ph(url, setup, process) {
    this._enabled = url.test(location.href);
    this._process = process;
    this._setup = setup;
}
wmt_ph.prototype = {
    process: function (xDoc) {
        if (this._enabled && this._process && xDoc) {
            this._process(xDoc);
        }
    },
    setup: function () {
        if (this._enabled && this._setup) {
            this._setup();
        }
    }
}
wmt_ph.setupHome = function () {
    /*Во время перехода здесь не будет никакой информации*/
    if (Timer.getMovement().isRunning()) {
        return;
    }
    
    /*Отдельный таймер ГР, если он не показывается в меню*/
    if (Timer.getWork().isRunning() && !Settings.showTimersAmongMenu) {
        var logoutB = document.querySelector('td.wbwhite[width="290"]>a[href*="logout.php"]>b');
        if (logoutB) {
            Timer.getWork().appendTo(logoutB.parentNode.parentNode.previousSibling.previousSibling);
        }
    }

    /*Случай с блокирующей новостью*/
    var skipNews = document.querySelector('a[href*="home.php?skipn=1"]');
    if (skipNews) {
        return;
    }
    showItemsCurrentDurability();
}
wmt_ph.processHome = function (xmlDoc) {
    /*Случай с переходом по карте*/
    if (updateMoveTimer()) {
        OwnInfo.store();
        return;
    }
    
    /*Случай с блокирующей новостью*/
    var skipNews = document.querySelector('a[href*="home.php?skipn=1"]');
    if (skipNews) {
        return;
    }

    var quitLink = xmlDoc.querySelector('a[href*="logout.php?"]');
    if (quitLink) {
        quitLink.parentNode.parentNode.firstChild.addEventListener("click", function () {
            OwnInfo.LastWork = {};
            OwnInfo.store();
        });
    }

    if (Timer.getWork().isRunning() == false && quitLink) {
        var lastObjLink = quitLink.parentNode.parentNode.querySelector('a[href*="object-info.php?id="]');
        if (lastObjLink) {
            var lastObjId = getObjectId(lastObjLink.href);
            if (lastObjId) {

                var wd = {};
                var getTime = function () {
                    if (wd.time) {
                        //указано начало смены
                        wd.minutes = +wmt_page.time.split(':')[1] - (+wd.time.split(':')[1]);
                        while (wd.minutes < 0) {
                            wd.minutes += 60;
                        }
                    }
                    else if (wd.left) {
                        //указано минут до конца смены
                        wd.minutes = wd.left;
                    }
                    else {
                        wd.minutes = guildTimeout.Worker / 60000;

                    }
                    

                    wd.now = new Date().getTime();
                    wd.nowDate = new Date(wd.now);
                    wd.result = wd.now - (wd.minutes * 60000);
                    wd.resultDate = new Date(wd.result);                    
                    return wd.result;
                }
                var cm = /\d{2}:\d{2}/.exec(lastObjLink.parentNode.textContent);
                var lm = /\d+/.exec(lastObjLink.parentNode.textContent);
                if (cm) {
                    wd.time = cm[0];
                }
                else if (lm) {
                    wd.left = lm[0];
                }
                OwnInfo.LastWork.ObjectId = lastObjId;
                OwnInfo.LastWork.Time = getTime();
                OwnInfo.store();
                Timer.getWork();
            }
        }
    }

    var mainTable = document.querySelector('table.wb[width="970"]');
    if (mainTable && mainTable.rows.length == 6) {
        var infoRow = mainTable.rows[1];
        if (infoRow && infoRow.cells.length == 2 && infoRow.cells[1].rowSpan == 2) {
            var servicesCell = infoRow.cells[1];
            var lastBattle = servicesCell.querySelector('a[href*="warlog.php?warid="]');
            if (lastBattle) {
                var warId = getWarId(lastBattle.href);
                if (OwnInfo.LastBattleId != warId) {
                    OwnInfo.LastBattleId = warId;
                    if (Timer.getHP().isRunning()) {
                        //Запрос протокола боев тут
                    }
                }
            }
            var ownInfoLink = infoRow.cells[0]
                .querySelector('center>a.pi[href*="pl_info.php?id=' + wmt_page.playerId + '"]');
            if (ownInfoLink) {
                let pe = ownInfoLink.parentNode
                    .querySelector('a[href*="shop.php?cat=potions"]>img[src*="star.gif"]') != undefined;                
                if (OwnInfo.premiumEnabled != pe) {
                    OwnInfo.premiumEnabled = pe;
                    
                }
            }
        }
    }
    OwnInfo.store();

    /*getFactionsAndGuildsInfo(document);*/
}
wmt_ph.setupMap = function () {
    if (!Timer.getWork().isRunning() || Settings.autoSellResources) {
        let startTime = getCurrentTime();
        let autoRefreshDelay = 10000 + (10000 * Math.random());
        let getTimeRemain = () => {
            let timeLeft = getCurrentTime() - startTime;
            if (timeLeft < autoRefreshDelay) {
                return Math.floor((autoRefreshDelay - timeLeft)/ 1000);
            }
            else {
                return 0;
            }
        }
        addStyle('.wmt-auto-refresh-badge { position: fixed; bottom: 0px; right: 0px; font-size: large; }');

        let autoRefreshBadge = createElement('span', 'wmt-auto-refresh-badge');
        autoRefreshBadge.appendChild(createTextNode('обновление через: '));
        let autoRefreshTimeRemain = createElement('span');
        autoRefreshTimeRemain.innerHTML = getTimeRemain();
        autoRefreshBadge.appendChild(autoRefreshTimeRemain);
        autoRefreshBadge.appendChild(createTextNode(' сек.'));
        document.body.appendChild(autoRefreshBadge);
        setInterval(() => {
            let timeRemain = getTimeRemain();
            autoRefreshTimeRemain.innerHTML = timeRemain;
            if (timeRemain <= 0) {
                location.reload();
            }
        }, 1000);

    }
    
    window.addEventListener('keypress', function (e) { if (e.keyCode == 112) toggleMap() });

    if (Settings.hideMap) {
        let mapObj = setMapObjectDisplay('none');
        if (mapObj) {
            mapObj.parentNode.parentNode.parentNode.appendChild(getTextMap());
        }
    }    

    if (Settings.hideHunt && Timer.getHunt().isRunning()) {
        var ht = document.querySelector('div#next_ht');
        if (ht) {
            var tb = getNthParentNode(ht, 4);
            if (tb) {
                tb.parentNode.removeChild(tb);
            }
        }
    }

    if (Timer.getMovement().isRunning()) {
        
    }
    else {
		var mapParam = getFlashObjectVars(getFlashObjectByMovie('map.swf'));
		var firstParam = mapParam[0].split(':');
		var currentSectorId = parseInt(firstParam[0].split('*')[2]);
		//mission undefined 0; accept required: -1;
		var mercenaryTargetSectorId = parseInt(firstParam[13]);
		var sectorLink = document.querySelector('b>a[href*="map.php"]'); 
		
		/*Ссылка на перемещение в сектор*/		
        insertMoveLink(sectorLink);
		
		var autopilotActionText = 'Переход через';
		var autopilotUrl;
		var autopilotParent;
		
		/*Авто доставка груза / вход в бой*/
		var confirmLink = document.querySelector('a[href*="map.php?action=accept_merc_task"]');
		if (confirmLink) {
			autopilotUrl = confirmLink.href;
			autopilotParent = confirmLink.parentNode;
		}
		
		/*Ссылка на переход в сектор ГН*/
		if (mercenaryTargetSectorId != 0 
			&& mercenaryTargetSectorId != currentSectorId 
			&& OwnInfo.premiumEnabled) {
			addStyle('.wmt-map-merc { display: inline-block; width: 80%; background: white; border: 1px solid black; margin-top: 1em; padding-bottom: 1em; }\
	.wmt-map-merc>span:first-child { font-weight: bold; display: block; margin-bottom: 1em; } ');
			var mercHead = createElement('span');
			mercHead.innerHTML = 'Задание от';
			var mercLink = createElement('a');
			mercLink.href = '/mercenary_guild.php';
			mercLink.innerHTML = 'Гильдии наемников';
			mercHead.appendChild(mercLink);
			
			var mercDiv = createElement('div', 'wmt-map-merc');
			mercDiv.appendChild(mercHead);
			
			if (OwnInfo.Mercenary.Task) {
				var taskB = createElement('b');
				taskB.innerHTML = wmt_MT.toString(OwnInfo.Mercenary.Task); 
				mercDiv.appendChild(taskB);
				mercDiv.appendChild(createElement('br'));
			}
			
			var targetSector;
			if (mercenaryTargetSectorId == -1) {
				targetSector = Map.getNearestSectorWithMercenaryPost(currentSectorId);
			}
			else {
				targetSector = Map.getSectorById(mercenaryTargetSectorId);
			}
			mercDiv.appendChild(createTextNode('Двигайтесь в '));
			var targetSectorLink = createSectorNameLink(targetSector);
			mercDiv.appendChild(targetSectorLink);
			insertMoveLink(targetSectorLink);
			sectorLink.parentNode.parentNode.insertBefore(mercDiv, sectorLink.parentNode.nextSibling);
			
			
			autopilotUrl = targetSectorLink.nextSibling.href;
			autopilotParent = mercDiv;			
		}
		
		/*Автосдача задания ГН*/
		if (mercenaryTargetSectorId == -1 && Map.isMercenaryPostThere(currentSectorId)) {
			autopilotActionText = 'Вход в гильдию через';
			autopilotUrl = '/mercenary_guild.php';					
		}
		
		var autopilot = createMercenaryAutopilot(autopilotUrl, autopilotActionText);
		if (autopilotParent && autopilotUrl){
			autopilotParent.appendChild(autopilot.root);
			autopilot.canStart = true;			
		}
		
		if (OwnInfo.Mercenary.Autopilot) {
			var dressUrl = (mercenaryTargetSectorId == currentSectorId)
		 		? ((confirmLink) ? null : '/inventory.php?all_on=1&r=1601350153694871552')
				: '/inventory.php?all_off=100&r=8176700537022971904';  
		
			var handleDressInventory = function (r) {				
				//set army here
				/*If need to dress */
				if (mercenaryTargetSectorId == currentSectorId) {
					if (r.status == "200" && r.readyState == "4") {
						var xDoc = parseXmlDoc(r.responseText);
						var ap = xDoc.getElementById('ap');							
						if (!ap || parseInt(ap.textContent) < 11) {
							wmt_Sound.playSequence('C 400, P 100, F 300');
							setTimeout(function(){
								location.assign('/inventory.php');
							}, 2000);
						}
						else {
							if (Timer.getHP().isRunning()) {
								setTimeout(function() { location.reload(); }, Timer.getHP().getLostTime().Ts * 1000);
							}
							else {
								location.reload();	
							}
							
							
						}							
					}					
				}
				else {
					autopilot.start();	
				}				
			}
			
			if (dressUrl) {
				GM_xmlhttpRequest({
					method: 'get',
					url: dressUrl,
					onload: handleDressInventory,
				});	
			}
			else {
				autopilot.start();
			}
			
			if (Timer.getHP().isRunning()) {				
							
			}			
			else 
			{
				
			}				
		}
		
		
        //hunts 
        var huntSignals = document.querySelectorAll('td.wb[width="21"]>a[href*="plstats_hunters.php"]');
        if (huntSignals.length > 0) {
            if (Settings.hideHunt) {
                var h = getNthParentNode(huntSignals[0], 4);
                for (var ii = 0; ii < huntSignals.length; ii++) {
                    h.parentNode.removeChild(h.nextSibling);
                }
                h.parentNode.removeChild(h);
            }
            else {
                var startNode, endNode;
                addStyle('.wmt-nc { margin-left: 5px; display: inline;  } .wmt-ni { height: 18; }');
                addStyle('.wmt-map-hunt { margin-top: 10px; margin-bottom: 10px; }  .wmt-map-hunt>span { display:block; color: red;  }  \
.wmt-map-skip-hunt { font-size: x-large; vertical-align: 100%; text-decoration: none; }\
.wmt-map-ht { display: inline-block; width: 230px; margin-right: 10px; border: 1px solid black; }\
.wmt-easy-hunt td:first-child { background-image: url("http://dcdn.heroeswm.ru/i/map/nl1.gif"); background-size: 120% 120%; background-repeat: no-repeat; background-position: center; }\
.wmt-easy-hunt td:first-child>div { margin: 7px; }\
.wmt-map-hunt-condition { font-size: 18px; }\
.wmt-map-hunt-condition>img {  background: green; border-radius: 5px; }\
.wmt-map-hunt-condition>span { }\
.wmt-hunt-links>a { display: block; text-decoration: none; font-size: large; }');
                for (var ii = 0; ii < huntSignals.length; ii++) {
                    var cm = /mid=(\w+)\#/.exec(huntSignals[ii].href);
                    if (cm) {
                        var cr = new wmt_CR(cm[1]);
                        var noAttackMsg;
                        if (cr) {
                            var opCell = huntSignals[ii].parentNode;
                            if (!opCell) {
                                continue;
                            }
                            var huntConditionCell = opCell.previousSibling;
                            if (huntConditionCell) {
                                huntConditionCell.width = "500";
                                huntConditionCell.setAttribute("valign", "");
                                var tm = /\((\d+)\sшт\.\)/.exec(huntConditionCell.textContent);
                                var rm = /(\d+)\sзолота/.exec(huntConditionCell.textContent);
                                if (tm && rm) {
                                    var count = tm[1];
                                    /*var level = OwnInfo.PlayerInfo.Level;
                                    var lm = /level=(\d+)/.exec(huntSignals[ii].href);
                                    if (lm) {
                                        level = +lm[0];
                                    }*/
                                    var reward = +rm[1];
                                    var huntExp = Math.floor(cr.Exp * count / 5);
                                    huntConditionCell.className = 'wmt-map-hunt-condition'
                                    huntConditionCell.innerHTML = '';
                                    huntConditionCell.appendChild(createGoldImg());
                                    huntConditionCell.appendChild(createNumberDiv(reward));
                                    huntConditionCell.appendChild(createElement('br'));
                                    var expEl = createElement('span');
                                    expEl.appendChild(createTextNode('\uD83C\uDF93'));
                                    expEl.title = (reward / huntExp).toFixed(3);
                                    huntConditionCell.appendChild(expEl);
                                    huntConditionCell.appendChild(createNumberDiv(huntExp));


                                    var huntTbl = huntConditionCell.parentNode.parentNode.parentNode;
                                    if (ii == 0) {
                                        startNode = huntTbl;
                                    }
                                    else if (ii == huntSignals.length - 1) {
                                        endNode = huntTbl;
                                    }
                                    huntTbl.className = 'wmt-map-ht wmt-easy-hunt';
                                    var tds = huntTbl.querySelectorAll('td.wb');
                                    for (var jj = 0; jj < tds.length; jj++) {
                                        tds[jj].className = '';
                                    }

                                    //before br removing
                                    if (huntTbl.previousSibling.nodeName.toUpperCase() == 'BR') {
                                        huntTbl.parentNode.removeChild(huntTbl.previousSibling);
                                    }
                                    //Skip link removing
                                    var skipLink = huntTbl.querySelector('a[href*="skip"]');
                                    if (skipLink) {
                                        skipLink.parentNode.removeChild(skipLink);
                                    }


                                    var attackLink = huntTbl.querySelector('a[href*="map.php?action=attack"]');
                                    if (!attackLink) {
                                        noAttackMsg = huntConditionCell.parentNode.nextSibling.textContent;
                                        huntConditionCell.parentNode.nextSibling.innerHTML = '';
                                    }
                                }
                            }
                            opCell.className = 'wmt-hunt-links'
                            opCell.valign = "top";
                            huntSignals[ii].innerHTML = '\uD83C\uDFC6';
                            var atack = createElement('a');
                            atack.href = '/map.php?action=attack';
                            if (ii > 0) {
                                atack.href += '2';
                            }
                            atack.appendChild(createTextNode('\u2694'));
                            opCell.appendChild(atack);

                            var help = createElement('a');
                            help.appendChild(createTextNode('\uD83D\uDE4B'));
                            help.setAttribute('onclick', 'return print_friends();');
                            opCell.appendChild(help);

                            opCell.parentNode.parentNode.removeChild(opCell.parentNode.nextSibling);
                        }
                    }
                }
                var huntDiv = createElement('div', 'wmt-map-hunt');
                var range = document.createRange();
                range.setStartBefore(startNode);
                range.setEndAfter(endNode);
                range.surroundContents(huntDiv)

                var skipHunt = createElement('a', 'wmt-map-skip-hunt');
                skipHunt.href = '/map.php?action=skip';
                skipHunt.appendChild(createTextNode('\uD83D\uDC63'));
                huntDiv.appendChild(skipHunt);

                if (noAttackMsg != undefined) {
                    var noAttackEl = createElement('span');
                    if (Timer.getHP().isRunning()) {
                        noAttackEl.appendChild(createTextNode('Восстанавливается армия'));
                    }
                    else {
                        noAttackEl.appendChild(createTextNode(noAttackMsg));
                    }
                    huntDiv.appendChild(noAttackEl);
                }

                var fr = document.querySelectorAll('div[id*="friend"]');
                for (var ii = 0; ii < fr.length; ii++) {
                    fr[ii].parentNode.removeChild(fr[ii]);
                    huntDiv.appendChild(fr[ii]);
                }
            }
        }

        
		
		
        var mot = 0;
        var motReg = new RegExp('mot_' + wmt_page.playerId + '=(\\d);');
        var motMatch = motReg.exec(document.cookie);
        if (motMatch) {
            mot = +motMatch[1];
        }

        /*Настройка таблицы объектов*/
        var objectsTable = document.querySelector('table.wb[width="500"]');
        if (objectsTable) {
            /*If map objects type is objects*/
            if (mot < 3) {
                addStyle('.wmt-update-object-cell { width: 20px; text-align: center; border-right: none; }\
.wmt-update-object-button { height: 15px; width: 15px; display: inline-block; border-radius: 5px; border-size: 1px; border-color: darkgreen; background: linear-gradient(to bottom right, lightgreen, darkgreen) repeat scroll 0% 0% transparent; cursor: pointer; -moz-user-select: none;  }\
.wmt-update-object-button-normal { border-style: outset; }\
.wmt-update-object-button-pressed { border-style: inset; background: linear-gradient(to top left, lightgreen, darkgreen) repeat scroll 0% 0% transparent; }\
.wmt-update-object-button>span { position: relative; top: -2px; color: white; }\
.wmt-update-object-button-pressed>span { font-weight: bold; color: yellow   ; top:-3px; left: -1px; }\
.wmt-map-ors>td:first-child:after { content: ">>>", color: green; font-weight: bold; }\
.wmt-map-orr>td:nth-child(3) { font-weight: bold; }\
.wmt-map-orp>td:nth-child(3) { color: gray; }\
.wmt-map-orc>td:nth-child(2):after { content: "\u2692"; color: green; margin-right: -0.5em; margin-left: 0.1em; }');
                /*Setup header*/
                if (objectsTable.rows.length > 0) {
                    var row = objectsTable.rows[0];
                    row.removeChild(row.cells[1]);
                    row.removeChild(row.cells[1]);
                    row.removeChild(row.cells[1]);
                    row.removeChild(row.cells[2]);
                    var addHCell = function (title) {
                        var titleB = createElement('b');
                        titleB.innerHTML = title;// appendChild(createTextNode(title));
                        var hCell = createElement('td', 'wbwhite');
                        hCell.appendChild(titleB);
                        hCell.align = 'center';
                        row.appendChild(hCell);
                        return hCell;
                    }
                    addHCell('<img height="15" src="' + wmt_page.images.gold + '">').width = '3em';
                    addHCell('\uD83D\uDD50').width = '1em';
                    addHCell('\uD83D\uDC68');
                                        
                    row.cells[1].innerHTML = '\uD83D\uDCB0';

                    var updateNext = function () {
                        objectsTable.updatedRow += 1;
                        if (objectsTable.updatedRow < objectsTable.rows.length) {
                            var button = objectsTable.rows[objectsTable.updatedRow].lastChild.firstChild;
                            if (button) {
                                button.click();
                            }
                            setTimeout(updateNext, 1000);
                        }
                    }

                    addHCell('RA').addEventListener('click', function () {
                        objectsTable.updatedRow = 0;
                        setTimeout(updateNext, 500);
                    });

                }

                var addTCell = function (row, align) {
                    var resCell = createElement('td', row.cells[0].className);
                    if (!align) {
                        align = 'center';
                    }
                    resCell.align = align;
                    resCell.appendChild(createTextNode('-'));
                    row.appendChild(resCell);
                    return resCell;
                };

                /*Setup object-info rows*/
                for (var ii = 1; ii < objectsTable.rows.length; ii++) {
                    var row = objectsTable.rows[ii];
                    var objLink = row.querySelector('a[href*="object-info.php"]');
                    if (!objLink) {
                        continue;
                    }
                    else {
                        objLink.target = '_blank';
                    }

                    var objId = getObjectId(objLink.href);
                    if (!objId) {
                        log('Not found object id for: ' + objLink.href);
                        continue;
                    }

                    row.id = 'wmt_object_info_row_' + objId;
                    var objInfo = new ObjectInfo(objId);
                    objInfo.update();
                    /**/
                    var className = row.cells[0].className;
                    var stock = row.cells[3].textContent;

                    /*Оставляем только колонку с названием и зарплатой*/
                    row.removeChild(row.cells[1]);
                    row.removeChild(row.cells[1]);
                    row.removeChild(row.cells[1]);
                    row.removeChild(row.cells[2]);

                    var salaryB = row.cells[1].querySelector('b');
                    if (salaryB) {
                        salaryB.title = salaryB.textContent;
                        salaryB.innerHTML = getRealSalary(salaryB.textContent)
                    }

                    addTCell(row, 'right');
                    addTCell(row);
                    addTCell(row);

                    var updateSp = createElement('span');
                    updateSp.appendChild(createTextNode('\u267B'));
                    //updateSp.appendChild(createTextNode('\u2B04'));

                    var updateBtn = createElement('div', 'wmt-update-object-button wmt-update-object-button-normal');
                    updateBtn.appendChild(updateSp);
                    updateBtn.objectInfo = objInfo;
                    updateBtn.title = objInfo.Id;
                    updateBtn.addEventListener('click', function () {
                        this.objectInfo.Balance = undefined;
                        this.objectInfo.WorkShiftEnd = undefined;
                        this.objectInfo.FreeWorkPlaceCount = undefined;
                        this.objectInfo.store();
                        updateObjectInfoRow(this.objectInfo);
                        this.className = 'wmt-update-object-button wmt-update-object-button-pressed';
                        GM_xmlhttpRequest({
                            url: '/object-info.php?id=' + this.objectInfo.id,
                            method: 'GET',
                            headers: {
                                "Referer": location.href,
                                "DNT": "1"
                            },
                            overrideMimeType: 'text/html;charset=windows-1251',
                            onload: handleObjectInfoResponse
                        });

                    });

                    var updateCell = row.insertCell();
                    updateCell.className = className + ' wmt-update-object-cell';
                    updateCell.appendChild(updateBtn);

                    /*Проверка устаревания данных*/
                    if ((getCurrentTime() - objInfo.actualTime > 60000 && objInfo.freeWorkPlaceCount != 0)
                        || objInfo.stock != stock || objInfo.className != className) {
                        objInfo.className = className;
                        objInfo.stock = stock;
                        objInfo.balance = undefined;
                        objInfo.freeWorkPlaceCount = undefined;
                        objInfo.useWorkPlaceCount = undefined;
                        objInfo.workShiftEnd = undefined;
                        objInfo.canSellResources = undefined;
                        objInfo.store();
                    }
                    else {
                    }
                    updateObjectInfoRow(objInfo);
                }
            }
        }
        else {
            //log('Objects table not found');
        }
    }
}
wmt_ph.processMap = function (xmlDoc) {
    if (!xmlDoc) {
        log('xmlDoc undefined');
        return;
    }

    OwnInfo.update();

    updateMoveTimer();

    var dm = /var Delta2 = (\d+);/.exec(xmlDoc.body.innerHTML);
    if (dm) {
        OwnInfo.Hunt.Time = getCurrentTime();
        OwnInfo.Hunt.Interval = dm[1] * 1000;
    }

    OwnInfo.store();
}
wmt_ph.setupObjectInfo = function(){
	window.addEventListener('keypress', function(e){
		if (e.keyCode == 112) {
			sellRes();
			setTimeout(function(){
				location.reload();
			}, 500);			
		}
	});
	
	var sellRes = function(){
		var selResCount = document.querySelector('form[action*="sell_res.php"]>nobr>input[name="count"]');
		if (selResCount) {
			selResCount.value = '10';
			selResCount.parentNode.parentNode.submit();
		}
	}
	
    var objectId = getObjectId(location.href);
    if (!objectId) {
        log('objectId undefined: ' + objectId);
        return;
    }

    var objInfo = new ObjectInfo(objectId);
    objInfo.update();

    let goldImg = document.querySelectorAll('img[src*="gold.gif"]');    
    for (let imi = 0; imi < goldImg.length; imi++) {
        if (!goldImg[imi].parentNode.nextSibling) {            
            continue;
        }
        let salaryB = goldImg[imi].parentNode.nextSibling.firstChild;
        if (salaryB && salaryB.textContent == objInfo.salary) {
            let delta = getRealSalary(objInfo.salary) - objInfo.salary;
            let deltaSpan = createElement('span');
            deltaSpan.style.marginLeft = '0.2rem';
            deltaSpan.style.fontWeight = 'normal';
            deltaSpan.innerHTML =  delta == 0 ? '' : (delta > 0 ? '+' + delta : delta);
            salaryB.appendChild(deltaSpan);
        }
        else {
            
        }
    }

    /*Конфигурация объекта*/
    var objConfig = {
        /*Предупреждение о начале смены*/
        warnShift: undefined,
        /*Автообновление, c*/
        refreshDelay: undefined,
        update: function () { Storage.update(this); },
        store: function () { Storage.store(this); },
        getStorageKey: function () { return 'wmt_object_settings_' + objectId; }
    }
    objConfig.update();

    /*Настройка интервала автообновления*/
    var refreshDelay = 60;
    var setAutoRefreshDelay = function (cd) { window.eval('Delta=' + (cd || refreshDelay) ); };
    if (objConfig.refreshDelay > 0) {
        refreshDelay = objConfig.refreshDelay;
    }
    else if (Settings.objectInfoRefreshDelay > 0) {
        refreshDelay = Settings.objectInfoRefreshDelay;
    }
    
    if (refreshDelay > 0) {
        setAutoRefreshDelay();
    }


    var img = document.querySelector('img[src*="/i/objs/"]');
    if (img) {
        img.style.display = 'none';
    }

    /*Форма покупки ресурса*/
    var buyResForm = document.querySelector('form[name="buy_res"]');
    if (!buyResForm) {
        log('buy_res form is not found');
        return;
    }

    /*Move direct link*/
    var infoTable = buyResForm.previousSibling;
    while (infoTable && infoTable.nodeName.toLowerCase() != 'table') {
        //log(infoTable.nodeName);
        infoTable = infoTable.previousSibling;
    }
    if (infoTable) {
        var mapLink = infoTable.querySelector('a[href*="map.php"]');
        if (mapLink) {
            insertMoveLink(mapLink);

            addStyle('.wmt-obj-bls { color: #fff; cursor: pointer; margin-top: -1em; display: inline-block;  font-size:large; margin-left: 5px; }\
.wmt-obj-blt { color: black; }')
            var bell = createElement('span', 'wmt-obj-bls');
            bell.innerHTML = '\uD83D\uDD14';
            bell.onclick = function () {
                if (objConfig.warnShift == objInfo.workShiftEnd) {
                    delete objConfig.warnShift;
                }
                else {
                    objConfig.warnShift = objInfo.workShiftEnd;
					wmt_Sound.beep(350, 0, 100);
                }
                objConfig.store();
                updateBell();
            };
            if (objInfo.workShiftEnd) {
                if (OwnInfo.workEfficiencyBonusFactor > 1) {
                    mapLink.parentNode.lastChild.lastChild.insertBefore(bell, mapLink.parentNode.lastChild.lastChild.lastChild);
                }
                else {
                    mapLink.parentNode.insertBefore(bell, mapLink.parentNode.lastChild);
                }
            }
            else {
                mapLink.parentNode.appendChild(createTextNode('Окончание смены: --:--'));
                mapLink.parentNode.appendChild(bell);
            }
            var updateBell = function () {
                var d;
                if (objConfig.warnShift) {
                    if (objConfig.warnShift != objInfo.workShiftEnd) {
                        bell.style.color = 'yellow';						
                        delete objConfig.warnShift;
                        objConfig.store();
						wmt_Sound.beep();                        
						setInterval(function() {wmt_Sound.beep()}, 1000);
                    }
                    else {
                        bell.style.color = 'red';
                        var lastTime = getShiftEndElapse(objInfo.workShiftEnd);
                        bell.title = 'Сигнал начала смены прозвучит примерно через ' + lastTime + ' минут';                        
                        if (lastTime == 1) {
                            d = 60 - new Date().getSeconds();
                        }
                        else if (lastTime == 60) {
                            d = 2;
                        }
                    }
                                        
                }
                else {
                    if (objInfo.workShiftEnd) {
                        bell.style.color = '';
                        bell.title = 'Включить сигнал о начале смены';
                    }
                    else {
                        bell.style.display = 'none';
                    }
                }
                setAutoRefreshDelay(d);
            };
            updateBell();
        }
        else {
            log('Maplink is undefined');
        }
    }
    else {
        log('infoTable was not found');
    }

    var selResCounts = document.querySelectorAll('form[action*="sell_res.php"]>nobr>input[name="count"]');
    for (var ii = 0; ii < selResCounts.length; ii++) {
        selResCounts[ii].value = '9';
    }


    if (OwnInfo.LastWork.Image) {
        addStyle('.wmt-last-code-lb { padding-left: 0.3em; font-size: small; font-weight: bold; }\
.wmt-last-work-code { padding: 5px; width: 7em; margin: 3px; text-align: center; }\
.wmt-last-work-code-copy-btn { height: 2em; width: 2em; position: relative; top: 3px; }');
    }

    var appendLastCodeElements = function (node) {
        var lb = createElement('span', 'wmt-last-code-lb');
        lb.innerHTML = 'Последний код:';
        node.appendChild(lb);

        var lastCodeInput = createElement('input', 'wmt-last-work-code');
        lastCodeInput.type = 'text';
        if (OwnInfo.LastWork.Code) {
            lastCodeInput.value = OwnInfo.LastWork.Code;
        }
        lastCodeInput.addEventListener('change', function () {
            OwnInfo.update();
            OwnInfo.LastWork.Code = this.value;
            OwnInfo.store();
        });
        node.appendChild(lastCodeInput);
        var copyCodeBtn = createElement('button');
        copyCodeBtn.className = 'wmt-last-work-code-copy-btn';
        copyCodeBtn.appendChild(createTextNode('\uD83D\uDCCB'));
        //copyCodeBtn.innerHTML = '<img width="16" height="16" title="" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH1gETCToqhryocwAAAK1JREFUOMutkk0KwjAQhZ+QCxXEAwgueiB/0IXJIhLjgVwIHkCayZHqpglSJtO0+FaBDC9fPmblvL0C0JCjT4eLYW+ct/1UnLd9qVmlw+v9ZAd221ZEywXrZoMlyQVd/PyPIFCHQAEAQCFmV5xYloAo4rg/iy/fHzcNwLAE6dUasaKDGrGKa00ENWIVAD38ZxnBsKJmvJ1zCIqZ5YDLmIArFAumtlAqKIr9nQGAL0ezaR+0HlviAAAAAElFTkSuQmCC" />';
        copyCodeBtn.title = 'Копировать код в буфер обмена';
        copyCodeBtn.addEventListener('click', function () {
            GM_setClipboard(lastCodeInput.value);
        });
        node.appendChild(copyCodeBtn);
    }


    var workingForm = document.querySelector('form[name="working"]');
    if (workingForm) {
        buyResForm.parentNode.insertBefore(workingForm, buyResForm.parentNode.firstChild);
        if (OwnInfo.LastWork.Code) {
            var tbl = workingForm.querySelector('table.wb');
            if (tbl) {
                var cell = tbl.rows[tbl.rows.length - 1].cells[0];
                cell.appendChild(createElement('br'));
                appendLastCodeElements(cell);
            }
        }
    }	
    else if (OwnInfo.LastWork.Image) {
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
        workCodeImg.src = OwnInfo.LastWork.Image;
        workCodeImg.addEventListener('click', function () {
            OwnInfo.update();
            OwnInfo.LastWork.Image = undefined;
            OwnInfo.LastWork.Code = undefined;
            OwnInfo.store();
            infoTable.parentNode.removeChild(infoTable);
        });
        codeImgCell.appendChild(workCodeImg);

        appendLastCodeElements(infoTable.insertRow(2).insertCell(0));

        if (OwnInfo.LastWork.ObjectId == objectId
            && OwnInfo.LastWork.Href) {
            //здесь вставить блок автоустройства до конца действия кода
        }

        buyResForm.parentNode.insertBefore(infoTable, buyResForm.parentNode.firstChild);		
    }
	if (Timer.getWork().isRunning()){
		//продаем рес
		sellRes();
			
	}	
}
wmt_ph.processObjectInfo = function (xmlDoc, objectId) {
    if (!xmlDoc) {
        log('xmlDoc undefined');
        return;
    }

    var workCodeImg = xmlDoc.querySelector('img[src*="work_codes"]');
    if (workCodeImg) {
        OwnInfo.update();
        if (OwnInfo.LastWork.Image != workCodeImg.src) {
            OwnInfo.LastWork.Image = workCodeImg.src;
            OwnInfo.LastWork.CodeHour = wmt_page.getHour();
            OwnInfo.store();
        }
    }
    else {
        //log('Not found workCodeImg');
    }

    if (!objectId) {
        objectId = getObjectId(xmlDoc.location.href);
    }

    var buyResForm = xmlDoc.querySelector('form[name="buy_res"]');
    if (buyResForm) {
        var objInfo = new ObjectInfo(objectId);
        objInfo.update();

        var tbl = buyResForm.parentNode;
        var range = xmlDoc.createRange();
        range.setStart(tbl.firstChild, 0);
        range.setEnd(buyResForm.previousSibling, 0);
        var headText = range.toString();

        var balanceMatch = /Баланс:\s([\d\,]+)/.exec(headText);
        if (balanceMatch) {
            objInfo.balance = balanceMatch[1].toString().replace(/,/g, '');
        }

        var freePlaceMatch = /Свободных\sмест:\s(\d+)/.exec(headText);
        if (freePlaceMatch) {
            objInfo.freeWorkPlaceCount = +freePlaceMatch[1];
        }

        var usedPlaceMatch = /Список\sрабочих\s\((\d+)\):/.exec(headText);
        if (usedPlaceMatch) {
            objInfo.useWorkPlaceCount = +usedPlaceMatch[1];
        }

        var shiftEndMatch = /Окончание\sсмены:\s+(\d{2}:\d{2})/.exec(headText);
        if (shiftEndMatch) {
            objInfo.workShiftEnd = shiftEndMatch[1];
        }
        else {
            objInfo.workShiftEnd = undefined;
        }

        var salaryMatch = /Зарплата:\s(\d+)/.exec(headText);
        if (salaryMatch) {
            objInfo.salary = +salaryMatch[1];
        }

        var mapLink = tbl.querySelector('a[href*="map.php?cx="]');
        if (mapLink) {
            var sector = Map.getSectorByHref(mapLink.href);
            if (sector) {
                objInfo.sectorId = sector.id;
            }
        }
        else {
            log('no sector link');
        }

        var selResForms = document.querySelectorAll('form[action*="sell_res.php"]');
        objInfo.canSellResources = selResForms.length > 0;

        var reqTable = tbl.querySelector('td>table.wb');
        if (reqTable && reqTable.rows.length > 1 && reqTable.rows[0].cells.length == 6) {
            objInfo.requiredHours = +reqTable.rows[1].cells[1].textContent;
            objInfo.requiredResources = [];
            var row = reqTable.rows[1].nextSibling;
            while (row) {
                objInfo.requiredResources.push({
                    name: row.cells[0].textContent.trim(),
                    consumption: +row.cells[1].textContent,
                    price: +row.cells[2].textContent,
                    amount: row.cells[3].textContent.trim()
                });
                row = row.nextSibling;
            }
            objInfo.updateClass();
        }
        else {
            if (reqTable) {
                log('reqTable: ' + reqTable.textContent);
            }
            else {
                log('reqTable not found');
            }
        }


        objInfo.actualTime = getCurrentTime();
        objInfo.store();

        var workaholicPenaltyFactor = 1;
        var workaholicMatch = /\*\s(0.\d)\sштраф\sтрудоголика/.exec(headText);
        if (workaholicMatch) {
            workaholicPenaltyFactor = +workaholicMatch[1];
        }

        var efficiencyBonusFactor = 1;
        var effM = /Летний бонус: \+(\d+)% к зарплате/.exec(headText);
        if (effM) {            
            efficiencyBonusFactor += parseInt(effM[1]) / 100;
        }

        if (OwnInfo.WorkaholicPenaltyFactor != workaholicPenaltyFactor
            || OwnInfo.workEfficiencyBonusFactor != efficiencyBonusFactor) {
            OwnInfo.update();
            OwnInfo.workEfficiencyBonusFactor = efficiencyBonusFactor;
            OwnInfo.WorkaholicPenaltyFactor = workaholicPenaltyFactor;
            OwnInfo.store();
        }
    }
    else {
        log('Form with name "buy_res" is not found');
    }
}
wmt_ph.setupObjectDo = function () {
    history.back();
}
wmt_ph.processObjectDo = function (xmlDoc) {
    if (!xmlDoc) {
        log('xmlDoc is undefined');
        return;
    }

    /*Код устройства*/
    var workCodeMatch = /object_do\.php\?id=(\d+)&code=(\w+)/.exec(xmlDoc.location.href);
    if (workCodeMatch) {
        OwnInfo.LastWork.Code = workCodeMatch[2];
        OwnInfo.LastWork.Href = xmlDoc.location.href;
        OwnInfo.LastWork.ObjectId = workCodeMatch[1];
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
    OwnInfo.LastWork.ResponseText = responseText;

    if (/Вы устроены на работу\./.test(responseText)) {
        OwnInfo.LastWork.Time = getCurrentTime();
        OwnInfo.LastWork.CodeHour = undefined;
        OwnInfo.LastWork.Code = undefined;
        OwnInfo.LastWork.Image = undefined;
        OwnInfo.LastWork.Href = undefined;
    }
    OwnInfo.store();
}

wmt_ph.processPlayerInfo = function (xmlDoc, href) {
    if (href == undefined && xmlDoc.location != undefined) {
        href = xmlDoc.location.href;
    }
    else {
        log('player id is undefined');
        return;
    }
    var id = getPlayerId(href);
    if (id == undefined) {
        log('player id not found ' + href);
        return;
    }

    var h = new wmt_hero(id);
    h.update();
    h.actualTime = getCurrentTime();

    //race
    let raceImg = getRaceImg(xmlDoc);
    if (raceImg) {
        let fc = wmt_Faction.parse(raceImg.src);
        if (fc) {
            h.faction = fc.f;
            h.altclass = fc.c;
        }        
    }
    else {
        log('Race img is not found');
    }

    /*factions, guilds*/    
    let gf = getFactionsAndGuildsInfo(xmlDoc);
    h.anti = undefined;
    if (gf) {
        h.anti = [];
        for (var key in gf) {
            if (!~key.indexOf('гильдия')){
                h.anti.push(gf[key].level);
            }
        }
    }

    /*perks*/
    h.perks = undefined;
    var app = xmlDoc.querySelectorAll('a[href*="showperkinfo.php?name="]');
    if (app.length) {
        h.perks = {};
		var br = 'main';        
        for (var ii = 0; ii < app.length; ii++) {
			var c = app[ii].href.split('=')[1];
			if (/\d$/.test(c))
			{
				br = c.substring(0, c.length - 1);				
			}
			if (!h.perks[br])
			{
				h.perks[br] = [];
			}			
            h.perks[br].push({ code: c, name: app[ii].firstChild.title })            
        }
    }
    h.store();
}

wmt_ph.setupPlayerInfo = function () {
    var pid = getPlayerId(location.href);
    if (pid == undefined) {
        log('no player id ' + location.href);
        return;
    }       
    

    /*Hide family*/
    var fl = document.querySelector('table.wblight>tbody>tr:nth-child(2)>td.wb[colspan="3"]>a.pi[href*="pl_info.php?id="]');
    if (fl) fl.parentNode.parentNode.style.display = 'none';

    var userName, m, mailLink = document.querySelector('td.wb a[href*="sms-create.php?mailto="]');
    if (mailLink && (m = /mailto=(.+)/.exec(mailLink.href)) != null) {
        addStyle('.wmt-pi-tl { font-size: large; text-decoration: none; cursor: pointer; border: 1px solid black; padding: 0.1rem; margin: 0.2rem; border-radius: 0.3rem; }');
        mailLink.className = 'wmt-pi-tl';
        mailLink.innerHTML = "\u2709";
        userName = decodeCP1251(m[1]);
    }

    if (mailLink && userName) {

        var transferLink = createElement('a', 'wmt-pi-tl');
        transferLink.href = '/transfer.php#' + userName;
        transferLink.title = 'Передать ресурсы';
        transferLink.innerHTML = '\u2696';
        mailLink.parentNode.insertBefore(transferLink, mailLink);
    }
    
    var itsMe = userName == wmt_page.nickName;

    var tables = document.querySelectorAll('table.wblight');
    if (tables.length < 2)
    {
        log('Not enough tables');
        return;
    }
    var mainTable = tables[0];

    var makeExpander = function (t, h) {
        var v = itsMe ? 0 : 1;
        var set = function () {
            v = v ? 0 : 1;
            for (var ii = h + 1; ii < t.rows.length; ii++) {
                t.rows[ii].style.display = v ? '' : 'none';
            }
        }
        if (!h) h = 0;
        t.rows[h].addEventListener('click', set);
        set();
    }
    makeExpander(mainTable, mainTable.rows.length - 2);
    for (var ii = 1; ii < tables.length; ii++) {
        makeExpander(tables[ii]);
    }

    var hero = new wmt_hero(pid);
    hero.update();
    
    let raceImg = getRaceImg(document);
    if (raceImg) {
        let fl;
        if (hero.anti && hero.faction != undefined) {
            fl = hero.anti[hero.faction - 1];            
        }
        if (fl) {
            let flSup = createElement('sup');
            flSup.style = 'white-space: nowrap';
            flSup.title = 'Умение фракции ' + wmt_Faction.getName(hero.faction, 0, 2) + ' ' + fl + '.';
            flSup.innerHTML = fl;
            if (pid != wmt_page.playerId) {
                let me = new wmt_hero(wmt_page.playerId);
                me.update();
                if (me.faction != undefined) {
                    let antiSp = createElement('span');
                    antiSp.innerHTML = ' - ' + hero.anti[me.faction - 1];
                    antiSp.title = 'Антиумение ' + wmt_Faction.getName(me.faction, 0, 2) + ' - cнижение урона: +' + hero.anti[me.faction - 1]*3 + '%';
                    flSup.appendChild(antiSp);
                }
            }
            insertAfter(flSup, raceImg);
            let fb = wmt_Faction.getLevelBonus(fl);
            if (fb) {
                flSup.title += '\r\nБонус: ';
                let img = ['attack', 'defence', 'initiative'];
                for (let ii = 0; ii < img.length; ii++) {
                    if (fb[ii]) {
                        switch (ii) {
                            case 0:
                                flSup.title += ' нападение + ' + fb[ii];
                                break;
                            case 1:
                                flSup.title += ' защита +' + fb[ii];
                                break;
                            case 2:
                                flSup.title += ' инициатива +' + fb[ii] + '%';
                                break;
                        }                       

                        let im = document.querySelector('img[src*="/i/s_' + img[ii] + '.gif"]');
                        if (im) {
                            let b = im.parentNode.nextSibling.firstChild;
                            if (b) {
                                b.title = 'Бонус умения фракции: +' + fb[ii];
                            }                            
                        }
                    }                    
                }
            }
        }
    }
    
    /*quick perks*/
    if (hero.perks) {
        addStyle('.wmt-pli-perks { margin-top: 0.2em; } .wmt-pli-perks>div:first-child { float: left; }\
.wmt-pli-perks>div:last-child { display: inline-block; margin-left: 0.2em; }\
.wmt-pli-bd { width: 31.8em; margin-bottom: 0.2em; }\
.wmt-pli-bd>a { text-decoration: none; text-align: center;  width: 15.5em; white-space: nowrap; display: inline-block; padding: 2px; border-radius: 0.5em; margin-bottom: 0.1em; }\
.wmt-pli-bd>a:nth-child(odd) { margin-right: 0.1em; }');

        var perksDiv = createElement('div', 'wmt-pli-perks');
        var leftDiv = createElement('div');
        leftDiv.innerHTML = '\u00A0\u00BB\u00A0<b>\u041D\u0430\u0432\u044B\u043A\u0438:</b>';
        perksDiv.appendChild(leftDiv);
        var rightDiv = createElement('div');
        perksDiv.appendChild(rightDiv);

        var pc = {
            main: '#B6BAC8',
            attack: '#FF7575',
            defense: '#CCCCFF',
            leadership: '#ABD94E',
            luck: '#FFFF85',
            enlightenment: '#B2B2B2',
            summon: '#B6FF6F',
            light: '#FFE478',
            destructive: '#FFCCB2',
            sorcery: '#8FB4FF',
            dark: '#FF99FF'
        }

        for (var branch in hero.perks) {
            //log(branch);
            if (pc[branch] == undefined) {
                log('unexpected branch: ' + branch);
                continue;
            }
            var bd = createElement('div', 'wmt-pli-bd');

            for (var ii = 0; ii < hero.perks[branch].length; ii++) {				
                var pb = createElement('a');
                pb.href = 'http://www.heroeswm.ru/showperkinfo.php?name=' + hero.perks[branch][ii].code;
                pb.style.backgroundColor = pc[branch];
                pb.innerHTML = hero.perks[branch][ii].name;
				var perk = new wmt_perk(hero.perks[branch][ii].code);
				perk.update();
				if (perk.desc){
					pb.title = perk.desc;
				}
                bd.appendChild(pb);
            }

            rightDiv.appendChild(bd);
        }

        var sectorLink = mainTable.querySelector('a[href*="map.php"]');
        if (sectorLink) {
            var brs = sectorLink.parentNode.querySelectorAll('br + br');
            for (var ii = 0; ii < brs.length; ii++) {
                brs[ii].parentNode.removeChild(brs[ii]);
            }
            var c = sectorLink.parentNode.querySelector('center');
            if (c) {
                c.style.margingTop = '1em';
            }

            sectorLink.parentNode.insertBefore(perksDiv, sectorLink.nextSibling);
        }
    }

    



    /*var leftCell, rightCell, stat = mainTable.querySelector('td[colspan="3"]>b');
    if (stat) {
        var r = stat.parentNode.parentNode;
        r.parentNode.removeChild(r.nextSibling);
        r.parentNode.removeChild(r);
    }

    for (var ii = 2; ii < tables.length; ii++) {
        tables[ii].style.display = 'none';
    }*/
    
    /*var infoTables = document.querySelectorAll('table.wblight[width="790"]');
    if (infoTables && infoTables.length > 0) {
        for (var ii = 0; ii < infoTables.length; ii++) {
            switch (ii) {
                case 0: 
                    //infoTables[ii].rows[infoTables[ii].rows.length - 1].addEventListener('click', function () { alert('1'); })
                    break;
            }
        }
    }*/
    showItemsCurrentDurability();
}
wmt_ph.setupMercenaryGuild = function () {
	
	var mainTable = document.querySelector('table.wbwhite');	
	
	var autopilot = createMercenaryAutopilot('/map.php');		
	autopilot.root.style.float = 'right';
	autopilot.canStart = false;
	mainTable.rows[0].cells[1].firstChild.appendChild(autopilot.root);
	
	
	/*Hide face*/
	var face = getFlashObjectByMovie('mercenary.swf', mainTable);
	if (face) {
		face.parentNode.parentNode.style.display = 'none';
	}
		
	/*Reward history*/
	if (OwnInfo.Mercenary.Rewards && OwnInfo.Mercenary.Rewards.length > 0) {
		addStyle('.wmt-merc-rh {  }\
		.wmt-merc-rhl img { vertical-align: middle; height: 2em; width: 2em; margin-left: 0.5em; }\
		.wmt-merc-rlts { font-weight: bold; vertical-align: middle; }\
		.wmt-merc-gs { color: goldenrod; vertical-align: middle; display: inline-block; min-width: 3em;  }\
		.wmt-merc-hg { }\
		.wmt-merc-hg { margin-top: 1em; }\
		.wmt-merc-hg.month { margin-left: 1em; }\
		.wmt-merc-hg.day { margin-left: 1em; }\
		.wmt-merc-hgt { vertical-align: middle; font-weight: bold; text-transform: capitalize; text-decoration: underline;\
		 cursor: pointer; -moz-user-select: none; }\
		.wmt-merc-hge { background: url("http://dcdn.heroeswm.ru/i/castle_show_ico.gif") no-repeat; background-size: cover;\
		 display: inline-block; cursor: pointer; height: 1.5em; width: 1.5em; border-radius: 0.5em; vertical-align: middle;\
		  margin-left: 0.5em; }\
		.wmt-merc-hge.open { background-image: url("http://dcdn.heroeswm.ru/i/castle_hide_ico.gif"); }');
		var rewardHistory = createElement('div', 'wmt-merc-rh');
		var rewardtitle = createElement('span');
		rewardtitle.innerHTML = 'Статистика наград';
		rewardHistory.appendChild(rewardtitle);
		var getExpanderClass = function(expander) {
			let result = 'wmt-merc-hge';
			if (expander.isOpen) {
				result += ' open';
			}
			return result;
		}
		var createExpander = function(isOpen) {
			var result = createElement('span');
			result.isOpen = isOpen;			
			result.addEventListener('click', function() {
				this.isOpen = !this.isOpen;
				this.className = getExpanderClass(this);
				
			}); 
			result.className = getExpanderClass(result);
			return result;
		}
		var getYearRow = function(year) {
			let rowId = 'wmt_merc_reward_year_' + year;
			var row = rewardHistory.querySelector('#' + rowId);
			if (!row){
				row = createElement('div', 'wmt-merc-hg year');
				row.id = rowId;
				row.rewards = [];
				
				let expander = createExpander();
				
				let title = createElement('span', 'wmt-merc-hgt');
				title.innerHTML = 'Год ' + (year  +1900);
				title.addEventListener('click', function() { expander.click(); });
				
				//sum \u2211
				row.appendChild(title);				
				row.appendChild(expander);
				rewardHistory.appendChild(row);				
			}
			return row;
		}
		var getMonthRow = function(year, month) {
			let monthId = 'wmt_merc_reward_month_' + month + '_' + year;
			var row = rewardHistory.querySelector('#' + monthId);
			if (!row) {
				row = createElement('div', 'wmt-merc-hg month');
				row.id = monthId;			
				var title = createElement('span', 'wmt-merc-hgt');
				title.innerHTML = new Date(year, month + 1, 1).toLocaleString('ru-RU', { month: 'long'});
				row.appendChild(title);
				getYearRow(year).appendChild(row);
			}
			return row;
		}
		var getDayRow = function(date) {
			let dayId = 'wmt_merc_reward_day_' + [date.getDate(), date.getMonth(), date.getYear()].join('_');			
			var row = rewardHistory.querySelector('#' + dayId);
			if (!row) {				
				row = createElement('div', 'wmt-merc-hg day');
				row.id = dayId;
				var title = createElement('span', 'wmt-merc-hgt');
				title.innerHTML = date.getDate() + ' ' + getMonthName(date.getMonth() + 1);
				row.appendChild(title);
				getMonthRow(date.getYear(), date.getMonth()).appendChild(row);
			}
			return row;
		}
		for (var ii = OwnInfo.Mercenary.Rewards.length - 1; ii >= 0; ii--) {
			var reward = OwnInfo.Mercenary.Rewards[ii];
			var rewardLine = createElement('div', 'wmt-merc-rhl');
			
			var timestamp = createElement('span', 'wmt-merc-rlts');
			var rewardTime  = new Date(reward[0]);
			timestamp.innerHTML = padLeft(rewardTime.getHours(), 2, '0') + ':' + padLeft(rewardTime.getMinutes(), 2, '0') + ':';
			rewardLine.appendChild(timestamp);			
			
			//rewardLine.appendChild(createGoldImg());			
			var goldSpan = createElement('span', 'wmt-merc-gs');
			goldSpan.innerHTML = reward[1];
			rewardLine.appendChild(goldSpan);
			for (var jj = 2; jj < reward.length; jj++) {
				if (reward[jj] <  craft_elements.length) {
					rewardLine.appendChild(createCraftElementImg(reward[jj]))					
				} else {
					rewardLine.appendChild(createTextNode(reward[jj]))
				}
			}
			getDayRow(rewardTime).appendChild(rewardLine);
		}
		
		var row = mainTable.insertRow();
		var cell = row.insertCell();
		cell.colSpan = 2;
		cell.appendChild(rewardHistory);
	}
	
    //mercenary.swf
    var acceptLink = document.querySelector('table.wbwhite a[href*="mercenary_guild.php?action=accept"]');
    if (acceptLink) {
		if (OwnInfo.Mercenary.Task && OwnInfo.Mercenary.Failed 
			&& OwnInfo.Mercenary.Failed.includes(OwnInfo.Mercenary.Task)) {
			acceptLink.style.color = 'red';		
		}
		else {
			acceptLink.style.color = 'green';
		}
		//Можно принять задание? OwnInfo.Mercenary.Task
		/*!AUTOMATION!*/
		/*setTimeout(function() { acceptLink.click() }, 1000);*/
		setInterval(function() { wmt_Sound.beep(); }, 7000);
    }
    else {
        var mapLink = document.querySelector('table.wbwhite a[href*="map.php"]');
        if (mapLink) {
            insertMoveLink(mapLink);
			autopilot.canStart = true;
			if (OwnInfo.Mercenary.Autopilot) {
				autopilot.start();	
			}									
        }
        else {			
			if (OwnInfo.Mercenary.Rewards && OwnInfo.Mercenary.Rewards.length > 0) {
				let reward = OwnInfo.Mercenary.Rewards[OwnInfo.Mercenary.Rewards.length - 1];
				let blueB = document.querySelector('font[color="blue"]>b>b:last-child');
				if (blueB) {
					addStyle('.wmt-merc-reward img, .wmt-merc-reward span { vertical-align: middle; } .wmt-merc-reward img { height: 3em; width: 3em; margin-left: 1em; } .wmt-merc-reward span { font-weight: bold; color: green; } ');
					let rewardDiv = createElement('div', 'wmt-merc-reward');
					
					rewardDiv.appendChild(createGoldImg());
					let tm = createElement('span');
					tm.innerHTML = reward[1];
					rewardDiv.appendChild(tm);
					
					for (var jj = 2; jj < reward.length; jj++) {
						if (reward[jj] <  craft_elements.length) {
							rewardDiv.appendChild(createCraftElementImg(reward[jj]))					
						} else {
							rewardDiv.appendChild(createTextNode(reward[jj]))
						}
					}
									
					blueB.parentNode.parentNode.parentNode.insertBefore(rewardDiv, blueB.parentNode.parentNode.nextSibling);
					blueB.parentNode.removeChild(blueB.previousSibling);//br
					blueB.parentNode.removeChild(blueB);
				}	 
			}            
        }
    }
}
wmt_ph.processMercenaryGuild = function(xmlDoc){	
	/*Проверка таймера*/
    let m = /Приходи\sчерез\s(\d+)\sмин\./.exec(xmlDoc.body.innerHTML);
    if (m && (!OwnInfo.Mercenary.Time ||
        (OwnInfo.Mercenary.Time && OwnInfo.Mercenary.Interval
	         && ((getCurrentTime() - OwnInfo.Mercenary.Time) > OwnInfo.Mercenary.Interval))
        )) {
		var min = +m[1];
		if (min == 1) {
			min = 1.99;
		}
		else {
			min += 0.1;
		}
        OwnInfo.Mercenary.Time = getCurrentTime();
        OwnInfo.Mercenary.Interval = 60000 * min;
    }
    else {
        if (!m) {
            log('Таймер отсутсвует в принципе!');
        }
        else {
            log('Таймер присутсвует но! ' + JSON.stringify(OwnInfo.Mercenary));
        }
        
    }
	
	/*Проверка текущей задачи*/		
	let taskB = document.querySelectorAll('table.wbwhite b');
	OwnInfo.Mercenary.Task = undefined;	
	for (let ii = 0; ii < taskB.length; ii++) {
		if (/\{\d+\}/.test(taskB[ii].textContent)) {
			OwnInfo.Mercenary.Task = wmt_MT.parse(taskB[ii].textContent);									
			break;
		}
	}	
	
	/*Проверка провала*/
	let failB = xmlDoc.querySelector('font[color="red"]>b');
	if (failB && OwnInfo.Mercenary.Task && OwnInfo.Mercenary.Failed 
	&& !OwnInfo.Mercenary.Failed.includes(OwnInfo.Mercenary.Task)) {
		if (!OwnInfo.Mercenary.Failed) {
			OwnInfo.Mercenary.Failed = [];
		}		
		OwnInfo.Mercenary.Failed.push(OwnInfo.Mercenary.Task);		
	}

	/*Проверка успеха и награды*/
	let rewardStr = 'Вы получаете';
	let doneB = xmlDoc.querySelectorAll('font[color="blue"] b');	
	for (var ii = 0; ii < doneB.length; ii++) {
		let str = doneB[ii].textContent;		
		let rsi = str.indexOf(rewardStr);		
		if (rsi >= 0) {
			let reward = [];
			reward.push(getCurrentTime());
			let items = str.substring(rsi + rewardStr.length).split(',');
			let m = /\d+/.exec(items[0]);
			if (m) {
				reward.push(+m[0]);
			}
			if (items.length > 1) {
				for (var ii = 1; ii < items.length; ii++) {
					let vl = items[ii].trim();
					for (var jj = 0; jj < craft_elements.length; jj++) {
						if (craft_elements[jj][0] == vl) {
							reward.push(jj);
							vl = undefined;
							break;
						}
					}
					if (vl) {
						reward.push(vl);
					}	
				}
			}	
					
			if (!OwnInfo.Mercenary.Rewards) {
				OwnInfo.Mercenary.Rewards = [];
			}
			OwnInfo.Mercenary.Rewards.push(reward);
			break;
		}
	}
	
	
	OwnInfo.store();		
}
wmt_ph.setupForumMessages = function () {
    /*battle link set*/
    var bl = document.querySelectorAll('a[href*="warid="]');
    for (var ii = 0; ii < bl.length; ii++) {
        var bLink = bl[ii];
        var m = /warid=(\d+)/.exec(bLink.href);
        if (m) {
            var warId = m[1];
            bLink.parentNode.insertBefore(createBattleLink(warId, '', getShowForAll(bLink.href)), bLink);
            bLink.parentNode.removeChild(bLink);
        }
    }

}
wmt_ph.setupWarlog = function () {
    addSelfLinkClasses();
    addStyle('.wmt-warlog-table {  }\
.wmt-warlog-table td.type { font-weight: bold; }\
.wmt-warlog-table-year-row {  }\
.wmt-warlog-table-day-row{  }\
.wmt-warlog-day-cell {  }\
.wmt-warlog-day-cell>span { margin-left: 1em; } .wmt-wrl-dc { margin-left: 1em; }');
    var pc = document.querySelector('b>font[color="red"]');
    if (pc) {
        pc.color = "blue";
        pc = pc.parentNode.parentNode;
    }

    var fl = document.querySelector('td>a[href*="warlog.php?warid="]');
    if (fl) {
        var td;
        if (pc) {
            td = pc.parentNode;
        }
        else
        {
            td = fl.parentNode;
            pc = td.firstChild;
        }

        //&show_for_all=\w+

        var selfLinks = td.querySelectorAll('a[href*="pl_info.php?id=' + wmt_page.playerId + '"]');
        if (selfLinks && selfLinks.length > 1) {
            for (var ii = 1; ii < selfLinks.length; ii++) {
                setupMySelfLink(selfLinks[ii]);
            }
        }

        var splitRows = splitChildrens(td, function (n) {
            var nodeName = n.nodeName.toLowerCase();
            return nodeName == "br" || nodeName == "center"
        });

        var tbl = createElement('table', 'wmt-warlog-table');
        var insertYearRow = function (year) {
            var row = tbl.querySelector('tr#year' + year);
            if (!row) {
                var yearCell = createElement('td', 'wmt-warlog-year-cell');
                yearCell.appendChild(createTextNode('20' + year + '-й год.'));
                yearCell.colSpan = 4;
                yearCell.align = 'center';
                var yearRow = createElement('tr', 'wmt-warlog-table-year-row');
                yearRow.id = 'year' + year;
                yearRow.appendChild(yearCell);
                tbl.appendChild(yearRow);
            }
        }
        var insertDayRow = function (month, day) {
            var row = tbl.querySelector('tr#day' + month + '_' + day);
            if (!row) {
                var db = createElement('b');
                db.appendChild(createTextNode(day));
                var monthSp = createElement('span');
                monthSp.appendChild(createTextNode(getMonthName(month)));
                var dayCell = createElement('td', 'wmt-warlog-day-cell');
                dayCell.colSpan = 2;
                dayCell.appendChild(db);
                dayCell.appendChild(monthSp);
                var dayRow = createElement('tr', 'wmt-warlog-table-day-row');
                dayRow.id = 'day' + month + '_' + day;
                dayRow.appendChild(dayCell);
                tbl.appendChild(dayRow);
                var bc = createElement('span', 'wmt-wrl-dc');
                dayCell.appendChild(bc);
                dayRow.count = 1;
                dayRow.updateCounter = function () { bc.innerHTML = '\u2211\u2009=\u2009<b>' + this.count + '</b>'; };
            }
            else {
                row.count += 1;
                if (row.count > 4)
                {
                    row.updateCounter();
                }
            }
        }
        if (splitRows.length > 2) {
            var d, dc = 0;
            for (var ii = 2; ii < splitRows.length; ii++) {
                var c1 = createElement('td'); // Date time
                var c2 = createElement('td'); // Links
                var c3 = createElement('td', 'type'); // Battle type
                var c4 = createElement('td'); // Description

                var arr = splitRows[ii];
                var ld, dc = 0;
                for (var kk = 0; kk < arr.length; kk++) {
                    var n = arr[kk];
                    if (n.nodeName == 'A'
                        && ~n.href.indexOf('warlog.php')) {
                        var date = getWarDate(n.textContent);
                        if (date) {
                            insertYearRow(date.Year);
                            insertDayRow(date.Month, date.Day);
                        }

                        var warId = getWarId(n.href);                        
                        var type = '';
                        var t = arr[kk + 1];
                        if (t.nodeType == 3 && ~t.nodeValue.indexOf(':')) {
                            type = t.nodeValue.replace(':', '');
                            kk++;
                            var tb = arr[kk + 1];
                            if (tb.nodeName == 'B' && tb.textContent.trim().length == 1) {
                                type = tb.textContent.trim();
                                kk++;
                            }
                        }

                        switch (type) {
                            case "•": c3.title = "Засада вора / Разбойники в ГН"; break;							
                            case "т": c3.title = "Гильдия тактиков"; break;
                        }

                        c1.appendChild(createTextNode(date.Time));
                        c2.appendChild(createBattleLink(warId, '', getShowForAll(n.href)));
                        c3.appendChild(createTextNode(type));
                    }
                    else {
                        if (n.textContent.trim()) {
                            c4.appendChild(n);
                        }
                    }
                }

                r = createElement('tr');
                r.appendChild(c1);
                r.appendChild(c2);
                r.appendChild(c3);
                r.appendChild(c4);
                tbl.appendChild(r);
            }
        }

        var r = document.createRange();
        r.setStartAfter(pc);
        r.setEnd(td.lastChild, 0);
        r.deleteContents();
        r.insertNode(tbl);
    }
}
wmt_ph.processWarlog = function (xmlDoc) {  
    
    let target = xmlDoc.querySelector('center>a.pi:nth-child(1)[href*="pl_info.php?id="]');

    if (!target) {
        log('The target for warlog is not found');
        return;
    }

    let isMine = target.href.indexOf('pl_info.php?id=' + wmt_page.playerId) != -1;
    if (isMine) {
        
        OwnInfo.update();
    }    

    let btl = xmlDoc.body.querySelectorAll('a[href*="warlog.php?warid=');
    for (let ii = 0; ii < btl.length; ii++) {        
        let type = btl[ii].nextSibling;        
        if (isMine
            && ~type.nodeValue.indexOf('•')) {
            let thief = type.nextSibling;
            
            if (!thief.href && thief.firstChild && thief.firstChild.href) {
                thief.href = thief.firstChild.href;
            }

            if (thief.href.indexOf('pl_info.php?id=' + wmt_page.playerId)) {
                /*Моя засада*/
                if (thief.nodeName != 'B') {
                    /*Поражение*/
                    let elapsed;
                    let wd = getWarDate(btl[ii].textContent);

                    if (wd) {                        
                        let date = new Date('20' + wd.Year + '-' + wd.Month + '-' + wd.Day + 'T' + wd.Time + ':00+0300');
                        if (date) {                            
                            elapsed = getCurrentTime() - date.getTime();
                        }
                    }
                    let timeout = guildTimeout.getThief();
                    if (elapsed < timeout) {
                        OwnInfo.Thief.Time = getCurrentTime();
                        OwnInfo.Thief.Interval = timeout - elapsed;
                    }
                    else {
                        OwnInfo.Thief.Time = undefined;
                        OwnInfo.Thief.Interval = undefined;
                    }

                }
                else {
                    /*Победа*/
                    OwnInfo.Thief.Time = undefined;
                    OwnInfo.Thief.Interval = undefined;
                }
                break;
            }            
        }
    }

    if (isMine) {
        OwnInfo.store();
    }
}
wmt_ph.setupArtInfo = function () {
    //Large modifers
    var tbl = document.querySelector('td.wblight>center>table[background*="artifacts"]');
    if (tbl) {
        let imgSize = 200;
        let elSize = 20;
        let elCount = 5;
	let efRow = tbl.rows[tbl.rows.length - 1];
        let fillRow = efRow.previousSibling;
	

        fillRow.cells[0].firstChild.height = imgSize - elSize
		- (tbl.rows.length > 2 ? 20 : 0);

        efRow.cells[0].firstChild.height = elSize;
        efRow.cells[0].firstChild.width = imgSize - (elSize * elCount);
        for (let ii = 1; ii <= elCount; ii++) {
            efRow.cells[ii].firstChild.width = elSize;
            efRow.cells[ii].firstChild.height = elSize;
        }
    }
    /*Тут можно пристроить оптислом*/
    var b = document.querySelectorAll('td.wblight>b');
    for (var ii = 0; ii < b.length; ii++) {
        if (~b[ii].textContent.indexOf('Стоимость ремонта')) {
            var id = getArtifactId(location.href);
            if (id) {
				/*Insert auction link*/
				var auc = new wmt_auc_items();
				auc.update();
				var cat = auc.getCategory(id);
				if (cat){
					var buyAuc = document.createElement('a');
					buyAuc.href = getArtAucHref(id, cat);
					buyAuc.style = "margin-left: 1em; font-style: italic;";
					buyAuc.innerHTML = '[Рынок]';
					b[ii].parentNode.appendChild(buyAuc);
				}
				 
				/*Insert item price per battle*/
                var item = new wmt_item(id);
                item.update();

                var l = createElement('b');
                l.appendChild(createTextNode('Стоимость боя:'));

                var vl = createElement('span');
                vl.appendChild(createTextNode(item.getPpb().toFixed(2)));
				item.log();

                var cd = createElement('div', 'wmt-art-ppb');
                cd.appendChild(l);
                cd.appendChild(vl);
                b[ii].parentNode.insertBefore(cd, b[ii]);
                addStyle('.wmt-art-ppb { margin-bottom: 0.5em; }  .wmt-art-ppb>span { display: block; }\
.wmt-art-ppb>span:before {content:""; margin-right: 3px; margin-bottom: -3px; display: inline-block; height: 20;\
width: 20; background-image: url(' + wmt_page.images.gold + ');"}');
                break;
            }
            else {

            }
        }
    }
}
wmt_ph.processArtInfo = function (xmlDoc, id) {
    var mainTable = xmlDoc.body.querySelector('table.wb');
    if (!mainTable) {
        log('mainTable is not found');
        return;
    }

    if (!id) {
        id = getArtifactId(xmlDoc.location.href);
    }
    
    var item = new wmt_item(id);
    item.update();

    item.name = mainTable.rows[0].textContent.split('[')[0].trim();
    
    
    var getCost = function (tbl) {
        var result = {};
        var r = tbl.rows[0];
        var index = 0;
        while (index < r.cells.length) {
            var img = r.cells[index].querySelector('img');
            if (img) {
                result[img.src.substring(img.src.lastIndexOf('/') + 1).split('.')[0]] = parseInt(r.cells[index + 1].textContent.replace(/,/g, ''));
            }
            index += 2;
        }
        return result;
    };

    var b = mainTable.rows[1].cells[1].querySelectorAll('b');
    for (var ii = 0; ii < b.length; ii++) {
        var key = b[ii].textContent.trim().toLowerCase();
        switch (key) {
			case 'прочность:':
				item.durability = parseInt(b[ii].nextSibling.textContent);				
				break;
            case 'стоимость:':
                item.value = getCost(b[ii].nextSibling);
                break;
            case 'стоимость ремонта:':
                item.repair = getCost(b[ii].nextSibling).gold;
                break;
            default:
                break;
        }
    }   
    
    item.mapBuyable = mainTable.querySelector('a[href*="ecostat_details.php?r=' + id + '"]') != undefined;

    item.store();
    log(JSON.stringify(item));
}
wmt_ph.setupBattleChat = function () {
    var inp = document.querySelector('input[name="warid"]');
    if (inp) {
        var prev = createElement('input');
        prev.type = 'button';
        prev.value = '<<';
        prev.onclick = function () {
            var val = +inp.value;
            val = val - 1000000;
            inp.value = val;
        }
        inp.parentNode.insertBefore(prev, inp);
    }
}
wmt_ph.setupPlayerHunterStat = function () {
    if (location.hash) {
        var armyName = location.hash.substring(1);
        //Якорь с именем существа
        var link = document.querySelector('a[href*="army_info.php?name=' + armyName + '"]');
        if (link) {
            addStyle('.wmt-hash-row { border: 2px solid black; } .wmt-hash-row td { background: yellow; }');
            var row = link.parentNode.parentNode;
            row.id = armyName;
            row.className = 'wmt-hash-row';
        }
    }
}
wmt_ph.setupArmyInfo = function () {
    var armyName = undefined;
    var armyNameMatch = /\?name=(\w+)/.exec(location.search);
    if (armyNameMatch)
    {
        armyName = armyNameMatch[1];
    }
    else
    {
        log('No army name: ' + location.search);
        return;
    }

    var firstCenter = document.querySelector('body > center');
    if (firstCenter) {
        var link = createElement('a');
        link.href = '/pl_hunter_stat.php?id=' + wmt_page.playerId + '#' + armyName;
        link.appendChild(createTextNode('Рекорд'));
        firstCenter.appendChild(link);

    }
}
wmt_ph.processAuction = function(xmlDoc){	
	/*Check items categories*/
	var auc = new wmt_auc_items();
	auc.update();
	
	var arts = xmlDoc.querySelectorAll('form[name="sel"]>select[name="ss2"]>option');
	if (auc.needUpdate(arts.length)) {
		auc.lastUpdate = getCurrentTime();
		auc.count = arts.length;
		auc.all = {};
		for (var ii = 0; ii < arts.length; ii++){
			var str = arts[ii].value.toString().split('#');			
			if (str.length == 2){
				if (!auc.all[str[0]]){
					auc.all[str[0]] = [];
				}
				auc.all[str[0]].push(str[1]);
			}	
		}		
		auc.store();						
	}
}
wmt_ph.setupAuction = function () {
    var artSelect = document.querySelector('select[name="ss2"]');
    if (artSelect) {
		/*Цена за бой*/
		addStyle('.wmt-auc-ppb { -moz-user-select: none; -webkit-user-select: none; user-select: none; }\
.wmt-auc-ppb>span { margin-right: 2px; border-radius: 1em; color: #E700FF; }\
.wmt-auc-lin { text-decoration: none; border-bottom: 1px solid black; display: inline-block; margin-bottom: 3px; white-space: nowrap; }\
.wmt-auc-lin:before { content: "#"; }  .wmt-auc-lin>span>em { margin-left: 4px; }\
.wmt-auc-it { padding: 3px; } .wmt-auc-it-new { background: green; } .wmt-auc-it-used { background: yellow; }\
.wmt-auc-it-best:before { content:"!";  background: lime; position: relative; top: 1.1em;  left: 0.1em; margin-top: -1.7em;\
    display: inline-block; font-size: x-large; border-radius: 0 0 0.5em 0.5em; width: 0.5em; text-align: center; }\
.wmt-auc-it-best>img { display: block; }');
		addStyle('.wmt-auc-filter { display: block; white-space: nowrap; font-size: small; }\
 .wmt-auc-filter>span:after { content: ":"}\
 .wmt-auc-filter>input { width: 5em; margin-left: 0.3em;}');
 		addStyle('.overprice { opacity: 0.1; } .overprice:hover {  opacity: 1; } ');
				
		
		var getModReplacement = function(m){
			var reg = /[EWAFIN](\d+)/g;
			var mods = [];
			var count = 0;
			var mm;
			while ((mm = reg.exec(m)) != null) {
				mods.push(mm[0]);
				count += (+mm[1]);
			}
			if (mods.length > 0) {
				return '<b>M' + count + '</b><span><em>' + mods.join('</em><em>') + '</em></span>';
			}
			else {
				return m;
			}
		}
		
		var row = artSelect.parentNode.parentNode.parentNode;
		/*-->Фильтр строк*/
		var auc_filter = {			
			getStorageKey: function() {
				return 'auc_filter_' + wmt_page.playerId;
			},
			update: function() {
				Storage.update(this);
			},
			store: function() {
				Storage.store(this);
			}
		}
		auc_filter.update();
		var cat = getNthMatch(/cat=([^&]+)/, location.search, 1);
		var art_type = getNthMatch(/art_type=([^&]+)/, location.search, 1);
		if (cat == 'res') {
			var resType = getNthMatch(/type=([^&]+)/, location.search, 1); 			
			if (resType == '1') {
				art_type = 'b_wood';
			}
			else if (resType == '2') {
				art_type = 'b_ore';
			}
			else if (resType == '3') {
				art_type = 'b_mercury';
			}
			else if (resType == '4') {
				art_type = 'b_sulphur';
			}
			else if (resType == '5') {
				art_type = 'b_crystal';
			}
			else if (resType == '6') {
				art_type = 'b_gem';
			}
		}
		if (!auc_filter[cat]) {
			auc_filter[cat] = {};
		}
		if (art_type && !auc_filter[cat][art_type]) {
			auc_filter[cat][art_type] = { };
		}		
		
		if (art_type) {
			 
			var maxPriceInput = createElement('input');
			maxPriceInput.type = 'text';			
			maxPriceInput.value = auc_filter[cat][art_type].max ? auc_filter[cat][art_type].max : '';
			maxPriceInput.addEventListener('change', function() {
				auc_filter[cat][art_type].max = this.value;
				auc_filter.store();
			})
			
			var maxPriceSpan = createElement('span');
			maxPriceSpan.innerHTML = 'max';
			
			var lb = createElement('label', 'wmt-auc-filter');
			lb.appendChild(maxPriceSpan);			
			lb.appendChild(maxPriceInput);			
			
			for (var ii = 0; ii < row.nextSibling.childNodes.length; ii++) {
				var cell = row.nextSibling.childNodes[ii];				
				if (cell.textContent == 'Цена'){
					cell.appendChild(lb);
				}	
			}			
		}
		else {			
			/*Настроить*/
			
		}
		/*<--Фильтр строк*/	
		
		
        while (row) {
            row = row.nextSibling;
            if (row && row.cells.length > 3) {
                var itTbl = row.cells[0].querySelector('table');
                if (!itTbl || itTbl.rows.length != 1 || itTbl.rows[0].cells.length != 2) {
                    continue;
                }
                var imgCell = itTbl.rows[0].cells[0];
                var descCell = imgCell.nextSibling;
                var priceCell = row.cells[2];

                var d = getItemDurability(imgCell);
                var p = getNumber(priceCell);

                var itemClasses = [];
                //wmt-auc-it-best - best choise
                itemClasses.push('wmt-auc-it');
                if (d) {
                    if (d.cur != d.max) {
                        itemClasses.push('wmt-auc-it-used');
                    }
                    else {
                        itemClasses.push('wmt-auc-it-new');
                    }
                }				 

                //price per battle
				var filterPrice = p;
                if (d && p) {
					filterPrice = p / d.cur;
                    var b = createElement('b');
                    b.appendChild(createTextNode(filterPrice.toFixed(2)));
                    var sign = createElement('span');
                    sign.appendChild(createTextNode("\u2460"));
                    var el = createElement('span', 'wmt-auc-ppb');
                    el.title = 'Цена одного боя';
                    el.appendChild(sign);
                    el.appendChild(b);
                    priceCell.appendChild(el);										
                } 
				
				var art_id = art_type;
				if (!art_id ){
					var art_link = imgCell.querySelector('a[href*="art_info"]');
					if (art_link) {
						art_id = getNthMatch(/id=([^&]+)/, art_link.href, 1);
					}
					else {
						var img = imgCell.querySelectorAll('img');
						for (var ii = 0; ii < img.length; ii++) {
							art_id = getNthMatch(/([^\/]+)\.\w+$/, img[ii].src, 1);
							break;							
						}
					}
				}
				
				row.className += ' ' + art_id; 
				
				if (cat != 'my' && (!auc_filter[cat][art_id] || !auc_filter[cat][art_id] || auc_filter[cat][art_id].max < filterPrice)) {						
						if (art_type) {
							row.className += ' overprice';
						}
						else {							
							row.style.display = 'none';	
						}
				}			

                //Join lot links, separate modifiers
                var inf = descCell.querySelector('b>a.pi[href*="auction_lot_protocol.php?id="]');
                if (inf) {
                    descCell.removeChild(descCell.firstChild); //remove lot number link
                    var range = document.createRange();
                    range.setStart(descCell, 0);
                    range.setEndBefore(inf.parentNode);
                    var el = createElement('a', 'wmt-auc-lin');
                    el.href = inf.href;
                    range.surroundContents(el);
                    descCell.removeChild(inf.parentNode);

                    el.innerHTML = el.innerHTML.replace(/^\s*-\s+/, '');
                    el.innerHTML = el.innerHTML.replace(/\[([EWAFIN]\d+)+\]/, getModReplacement);
                }
                imgCell.className = itemClasses.join(' ');
            }
        }
    }
}
wmt_ph.setupAuctionNewLot = function() {
	
	var auc = new wmt_auc_items();
	auc.update();
	
	var mainTable = document.querySelector('table.wbwhite');
		
	var formCell = mainTable.firstChild.firstChild;
	formCell.style.verticalAlign = 'top';
	
	var lCell = formCell.insertCell();	
	
	var responseProcessing = function(r){
		if (r.status == "200" && r.readyState == 4){
			lCell.innerHTML = '';
			var xmlDoc = parseXmlDoc(r.responseText);
			var itemRows = xmlDoc.querySelectorAll('tr.wb');
			var tbl = document.createElement('table');			
			for (var ii = 0; ii < itemRows.length; ii++){
				var row = tbl.insertRow();
				row.insertCell().innerHTML = itemRows[ii].firstChild.innerHTML;
				var pis = row.querySelectorAll('a.pi');
				for (var jj = 0; jj < pis.length; jj++){
					pis[jj].parentNode.removeChild(pis[jj]);
				}
				
				
				var d = getItemDurability(row.firstChild);
				var p = getNumber(itemRows[ii].cells[2]);
				if (d && p){
					var priceCell = row.insertCell();
					var gim = createGoldImg();
					gim.style.verticalAlign = 'inherit';
					priceCell.appendChild(gim);
					priceCell.appendChild(createTextNode(p));
					priceCell.appendChild(createElement('br'));
					priceCell.appendChild(createTextNode("\u2460"));
					priceCell.appendChild(createTextNode((p/ d.cur ).toFixed(2)));
				}
			}			
			lCell.appendChild(tbl);
		}
		else{
			lCell.innerHTML = 'Не удалось получить информацию';
		}		
	}
	
	var initDetailRequest = function(value) {
		var ss = value.split('@');
		if (ss.length == 2){
			var code = ss[0]
			var cat = auc.getCategory(code);
			if (cat) {
				lCell.innerHTML = 'Получение данных...';
				GM_xmlhttpRequest({
					url: getArtAucHref(code, cat),
                    method: 'GET',
                    headers: { 'Referer': location.href, 'DNT': '1' },
                    overrideMimeType: 'text/html;charset=windows-1251',
                    onload: responseProcessing
				});	
			}
			else {
				lCell.innerHTML = 'Не хватает информации для создания запроса';
			}			
		}
		else {
			lCell.innerHTML = 'Поиск информации не предусмотрен';
		}
	}
	
	var item = document.querySelector('select[name="item"]');
	if (item){
		item.addEventListener('change', function() { initDetailRequest(this.value)});
	}
}
wmt_ph.setupTavern = function () {
    if (updateMoveTimer()) {
        return;
    }

    var tavernGamesLink = document.querySelector('a[href*="tavern_games.php"]');
    if (tavernGamesLink == undefined) {
        log('Tavern games link not found');
        return;
    }

    var paramTable = getNthParentNode(tavernGamesLink, 4);
    if (paramTable == undefined) {
        log('Param table not found');
        return;
    }

    var bigTable = getNthParentNode(paramTable, 4);
    if (bigTable == undefined) {
        log('Big table not found');
        return;
    }

    /*Tavern drink*/
    var tavDrink = document.querySelector('td.wbwhite>a[href*="tavern.php?action=drink"]');
    if (tavDrink) {
        addStyle('.wmt-tvn-ds { text-decoration: underline; font-weight: bold; cursor: pointer; }');
        var inp = createElement('span', 'wmt-tvn-ds');
        inp.innerHTML = tavDrink.textContent;
        inp.href = tavDrink.href;
        inp.addEventListener('click', function () {
            OwnInfo.update();
            OwnInfo.TavernDrinkTime = getCurrentTime();
            OwnInfo.store();
            location.assign(this.href);
        })
        tavDrink.parentNode.replaceChild(inp, tavDrink);
    }
    else if (Timer.getLuck().isRunning()) {
        var wt = document.querySelector('table.wbwhite[width="700"]');
        if (wt) {
            var tbl = createElement('table', 'wbwhite');
            tbl.width = 700;
            var r = tbl.insertRow();
            var c = r.insertCell();
            c.innerHTML = '<b>Напиток удачи</b>';
            Timer.getLuck().appendTo(c);
            wt.parentNode.insertBefore(tbl, wt.previousSibling)
        }
    }
    

    var firstGameRowIndex = 2;
    /*Форма создания заявки и ожидание подтверждения добавляются первой строкой*/
    var creatingGame = ~location.href.indexOf('form=1');
    var inBattle = bigTable.querySelector('tbody>tr:first-child>td:first-child>font[color="red"]>b');
    var waitConfirmation = bigTable.querySelector('a[href*="cancel_card_game.php"]');
    if (creatingGame || inBattle || waitConfirmation) {
        firstGameRowIndex = 3;
    }

    var autoJoin = {
        /*Начало автоматического вступления, мс*/
        startTime: undefined,
        /*Выбранный инициатор*/
        selectedInitiatorId: undefined,
        /*Начало ожидания подтверждения, мс*/
        waitingStart: undefined,
        /*Отказывающиеся*/
        rejecters: [],
        /*Автоматическое вступление действует*/
        isEnabled: function () { return this.startTime && (getCurrentTime() - this.startTime) < this.getInterval(); },
        /*Возвращает интервал автообновления, сек*/
        getRefreshDelay: function () { return  Math.floor((Math.random() * 3) + 2); },
        /*Возвращает максимальное время ожидания, мс*/
        getInterval: function () { return 300000; },
        getStorageKey: function () {
            return 'tavernAutoJoin';
        },
        /*Указанный идентификатор включен в список отказывающихся*/
        isRejectersId: function (id) {
            for (var ii = 0; ii < this.rejecters.length; ii++) {
                if (this.rejecters[ii].id == id) {
                    return true;
                }
            }
            return false;
        },
        pushRejecterId: function (id) {
            for (var ii = 0; ii < this.rejecters.length; ii++) {
                if (this.rejecters[ii].id == id) {
                    this.rejecters[ii].time = getCurrentTime();
                    return;
                }
            }
            this.rejecters.push({ id: id, time: getCurrentTime() });
        },
        /*Очистка  и сохранение*/
        clear: function () {
            this.startTime = undefined;
            this.selectedInitiatorId = undefined;
            this.waitingStart = undefined;
            this.store();
        },
        update: function () {
            var t = this;
            Storage.update(t);
            //remove obsolette rejecters
            for (var ii = t.rejecters.length - 1; ii >= 0; ii--) {
                if (!t.rejecters[ii] || !t.rejecters[ii].id || !t.rejecters[ii].time 
                    || (getCurrentTime() - t.rejecters[ii].time > 600000)) {
                    t.rejecters.splice(ii, 1);
                }
            }
            t.store();
            if (!t.isEnabled()) {                
                if (this.startTime && waitConfirmation) {
                    setTimeout(() => waitConfirmation.click(), 500);
                }
                t.clear();
                return;
            }
            if (t.selectedInitiatorId)
            {             
                if (waitConfirmation) {
                    if (t.waitingStart) {
                        if ((getCurrentTime() - t.waitingStart) > 15000) {
                            t.pushRejecterId(t.selectedInitiatorId);
                            t.selectedInitiatorId = undefined;
                            t.waitingStart = undefined;
                            t.store();
                            setTimeout(function () { waitConfirmation.click(); }, 1000);
                        }
                    }
                    else {
                        t.waitingStart = getCurrentTime();
                        t.store();
                    }
                }
                else {
                    //Ждали кого то но он отказался или партия была сыграна
                    if (t.waitingStart) {
                        var waitingTime = getCurrentTime() - t.waitingStart;
                        if (waitingTime < (15000)) {
                            //он отказался 
                            t.pushRejecterId(t.selectedInitiatorId);
                            t.store();
                        }
                        else {
                            //Сыграна игра или истек таймаут ожидания
                            t.clear();
                        }
                    }
                    else {
                        //Присоединение не прошло
                        t.selectedInitiatorId = undefined;
                        t.store();
                    }
                }
            }
            else
            {
                //Все ОК
            }

        },
        store: function() {
            Storage.store(this);
        }
    };
    autoJoin.update();    

    if (Settings.tavernRefreshDelay && !creatingGame) {
        var delay = Settings.tavernRefreshDelay;
        if (autoJoin.isEnabled() && autoJoin.selectedInitiatorId == undefined) {
            delay = autoJoin.getRefreshDelay();
        }

        var df = bigTable.querySelector('div#tmr>font');
        if (df) {
            
            df.innerHTML = df.innerHTML.replace(/\d+/, delay);
        }
        window.eval('Delta = ' + delay + ';');
    }
    
    var getGameConditions = function (row) {
        if (row.cells.length > 5) {
            var result = {
                joinLink: row.cells[row.cells.length - 1].querySelector('a[href*="join_to_card_game.php?id="]'),
                bet: row.cells[row.cells.length - 2].textContent.replace(/,/g, ''),
                timeout: parseInt(row.cells[row.cells.length - 3].textContent),
                /*WARNING*/
                oneDeck: row.cells[row.cells.length - 4].querySelector('img[src*="1koloda"]') != undefined,
                initiatorLink: row.cells[row.cells.length - 5].querySelector('a[href*="pl_info.php?id="]'),
                initiatorLevel: parseInt(row.cells[row.cells.length - 5].querySelector('i').textContent.replace(/[\(\)]/g, '')),
                sector: Map.getSectorByName(row.cells[row.cells.length - 6].textContent)
            };

            if (result.initiatorLink)
            {
                result.initiatorId = getPlayerId(result.initiatorLink.href);
            }
            return result;
        }
    }
    
    var rules = [
        [[1, 9, 17, 25], 20, 5, 2, 2, 2, 50, 150],
        [[2, 10, 18, 26], 20, 10, 3, 3, 3, 75, 200],
        [[3, 11, 20, 27], 20, 10, 5, 5, 5, 150, 400],
        [[4, 12, 19], 20, 50, 1, 1, 5, 100, 300],
        [[5, 13, 21], 50, 50, 5, 3, 5, 100, 300],
        [[6, 14, 22], 20, 10, 3, 1, 2, 125, 350],
        [[7, 15, 23], 20, 10, 1, 1, 1, 200, 500],
        [[8, 16, 24], 30, 15, 4, 4, 4, 100, 300]
    ];    

    var betValues = [0, 40, 200, 400, 600, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 10000, 11000, 12000, 20000];

    var timeoutValues = [30, 45, 60];

    var filters = {
        rulesEnable: {},
        oneDeckEnable: undefined,
        infinityDeckEnable: undefined,
        betMin: undefined,
        betMax: undefined,
        levelMin: undefined,
        levelMax: undefined,
        disableBadPersons: undefined,
        timeoutEnable: {},
        checkConditions: function (gc) {
            if (gc == undefined) {
                return true;
            }

            /*Check level*/
            if ((this.levelMin != undefined && gc.initiatorLevel < this.levelMin)
                || (this.levelMax != undefined && gc.initiatorLevel > this.levelMax)) {
                return false;
            }

            /*Check timeout*/
            var enabledTimeouts = [];
            for (var ii = 0; ii < timeoutValues.length; ii++) {
                if (this.timeoutEnable[timeoutValues[ii]] == true) {
                    enabledTimeouts.push(timeoutValues[ii]);
                }
            }
            if (enabledTimeouts.length > 0 && enabledTimeouts.length < timeoutValues.length
                && enabledTimeouts.indexOf(gc.timeout) == -1) {
                return false;
            }

            /*Check deck*/
            if (gc.oneDeck) {                
                if (!this.oneDeckEnable && this.infinityDeckEnable) {
                    return false;
                }
            }
            else if (!this.infinityDeckEnable && this.oneDeckEnable) {
                return false;
            }

            /*Check bet*/
            if ((this.betMax != undefined && this.betMax >= 0 && this.betMax < betValues.length && betValues[this.betMax] < gc.bet)
                || (this.betMin != undefined && this.betMin >= 0 && this.betMin < betValues.length  && gc.bet < betValues[this.betMin])) {
                return false;
            }

            /*Check rules*/
            var enabledRules = [];
            for (var key in this.rulesEnable)
            {
                if (this.rulesEnable[key] == true)
                {                    
                    enabledRules.push(key);
                }
            }
            if (enabledRules.length > 0 && enabledRules.length < rules.length) {
                var sectorDisabled = true;
                for (var ii = 0; ii < enabledRules.length; ii++) {
                    for (var jj = 0; jj < rules[enabledRules[ii]][0].length; jj++) {
                        if (rules[enabledRules[ii]][0][jj] == gc.sector.id) {
                            sectorDisabled = false;
                            break;
                        }
                    }
                }
                if (sectorDisabled) {
                    return false;
                }
            }
            return true;
        },
        getStorageKey: function () {
            return 'tavernFilters';
        }
    };
    Storage.update(filters);

    var getSectorRules = function (sectorId) {
        for (var ii = 0; ii < rules.length; ii++) {
            for (var jj = 0; jj < rules[0].length; jj++) {
                if (rules[ii][0][jj] == sectorId) {
                    return rules[ii];
                }
            }
        }
    }

    var getSectorTitle = function (sectorId) {
        var r = getSectorRules(sectorId);
        if (r) {
            return 'Initial condition Tower: ' + r[1] + ' Wall: ' + r[2]  + ' Mines: ' + r[3] + ' Monasteries: ' + r[4] + ' Barracks: ' + r[5]
                + '\r\nVictory condition Tower: ' + r[6] + ' Resources: ' + r[7];
        }
        else {
            return 'Unknown sector ' + sectorId;
        }
    }

    var createFilter = function (title, setup) {                
        var titleElement = createElement('span', 'wmt-tvn-ftl');
        titleElement.appendChild(createTextNode(title));        

        var headDiv = createElement('div', 'wmt-tvn-fhd');
        headDiv.appendChild(titleElement);

        var containerDiv = createElement('div', 'wmt-tvn-ddn');
        var resultDiv = createElement('div', 'wmt-tvn-ftr');
        resultDiv.appendChild(headDiv);
        resultDiv.appendChild(containerDiv);

        if (setup != undefined) {
            setup(titleElement, containerDiv);
        }
        return resultDiv;
    }

    var setupSectorFilter = function (title, container) {
        container.style.width = '35em';
        var updateTitleClass = function () {
            var filterRules = 0;
            for (var key in filters.rulesEnable) {
                if (filters.rulesEnable[key] == true) {
                    filterRules++;
                }
            }
            if (filterRules > 0 && filterRules < rules.length) {
                title.className = 'wmt-tvn-ftl wmt-tvn-fte';
            }
            else {
                title.className = 'wmt-tvn-ftl';
            }
        }
        for (var ii = 0; ii < rules.length; ii++) {
            
            var ruleChecker = createElement('input', 'wmt-tvn-sei');
            ruleChecker.type = 'checkbox';
            ruleChecker.ruleIndex = ii;
            if (filters.rulesEnable[ii])
            {
                ruleChecker.checked = true;
            }
            else
            {
                ruleChecker.checked = false;
            }
            ruleChecker.onchange = function () {
                filters.rulesEnable[this.ruleIndex] = this.checked;
                Storage.store(filters);
                updateTitleClass();
                applyFilters();
            };

            var rule = rules[ii];
            var sectorNames = [];
            for (var jj = 0; jj < rule[0].length; jj++) {
                sectorNames.push(Map.getSectorById(rule[0][jj]).name);
            }
            var ruleTitle = createElement('span');           
            ruleTitle.appendChild(createTextNode(sectorNames.join(', ')));

            var ruleDiv = createElement('div');
            ruleDiv.appendChild(ruleChecker);
            ruleDiv.appendChild(ruleTitle);
            container.appendChild(ruleDiv);
        }
        updateTitleClass();
    }

    var setupDeckFilter = function (title, container) {
        container.style.width = '5em';
        var updateTitleClass = function () {
            if (filters.oneDeckEnable == filters.infinityDeckEnable) {
                title.className = 'wmt-tvn-ftl';
            }
            else {
                title.className = 'wmt-tvn-ftl wmt-tvn-fte'
            }
        }
        updateTitleClass();
        var createDeckFilter = function (src, getValue, setValue) {
            var ch = createElement('input');
            ch.type = 'checkbox';
            ch.checked = getValue();
            ch.onchange = function () {
                setValue(this.checked);
                Storage.store(filters);
                updateTitleClass();
                applyFilters();
            }
            var decImg = createElement('img');
            decImg.src = src;
            var decDiv = createElement('div');
            decDiv.appendChild(ch);
            decDiv.appendChild(decImg);
            return decDiv;
        }
        container.appendChild(createDeckFilter('/i/1koloda.png', function () { return filters.oneDeckEnable; }, function (val) { filters.oneDeckEnable = val; }));
        container.appendChild(createDeckFilter('/i/8koloda.png', function () { return filters.infinityDeckEnable; }, function (val) { filters.infinityDeckEnable = val; }));
    }

    var setupBetFilter = function (title, container) {
        container.style.width = '15em';
        var updateTitleClass = function () {
            if (filters.betMin == undefined && filters.betMax == undefined) {
                title.className = 'wmt-tvn-ftl';
            }
            else {
                title.className = 'wmt-tvn-ftl wmt-tvn-fte'
            }
        }
        updateTitleClass();
        var createBetFilter = function (title, getValue, setValue) {            
            var sel = createElement('select', 'wmt-tvn-bvi');
            var unsetOption = createElement('option');
            unsetOption.value = -1;
            unsetOption.appendChild(createTextNode('-'));
            sel.appendChild(unsetOption);
            for (var ii = 0; ii < betValues.length; ii++) {
                var opt = createElement('option');
                opt.appendChild(createTextNode(betValues[ii]));
                opt.value = ii;
                sel.appendChild(opt);
            }
            var currIndex = getValue();            
            if (currIndex != undefined && currIndex >= 0 && currIndex < betValues.length) {
                for (var ii = 0; ii < sel.options.length; ii++) {
                    if (sel.options[ii].value == currIndex) {
                        sel.options[ii].selected = true;
                        break;
                    }
                }
            }

            sel.addEventListener('change', function () {
                var selectedOption = this.options[this.selectedIndex];
                if (selectedOption) {
                    if (selectedOption.value == -1) {
                        setValue(undefined);
                    }
                    else {
                        setValue(parseInt(selectedOption.value));
                    }
                }
                Storage.store(filters);
                updateTitleClass();
                applyFilters();
            });

            var titleEl = createElement('span', 'wmt-tvn-bvc');
            titleEl.appendChild(createTextNode(title));

            var betDiv = createElement('div');
            betDiv.appendChild(titleEl);
            betDiv.appendChild(sel);
            return betDiv;
        }
        container.appendChild(createBetFilter('Минимум:', function () { return filters.betMin; }, function (val) { filters.betMin = val; }));
        container.appendChild(createBetFilter('Максимум:', function () { return filters.betMax; }, function (val) { filters.betMax = val; }));
    }

    var setupPlayerFilter = function (title, container) {
        container.style.width = '25em';
        var updateTitleClass = function () {
            if (filters.levelMin == undefined && filters.levelMax == undefined && filters.disableBadPersons == undefined) {
                title.className = 'wmt-tvn-ftl';
            }
            else {
                title.className = 'wmt-tvn-ftl wmt-tvn-fte'
            }
        }
        updateTitleClass();
        var createLevelFilter = function (levelTitle, getValue, setValue) {
            var sel = createElement('select', 'wmt-tvn-pli');
            var unsetOption = createElement('option');
            unsetOption.value = -1;
            unsetOption.appendChild(createTextNode('-'));
            sel.appendChild(unsetOption);
            for (var ii = 0; ii < betValues.length; ii++) {
                var opt = createElement('option');
                opt.appendChild(createTextNode(ii));
                opt.value = ii;
                sel.appendChild(opt);
            }
            var currIndex = getValue();
            if (currIndex != undefined && currIndex >= 0 && currIndex < betValues.length) {
                for (var ii = 0; ii < sel.options.length; ii++) {
                    if (sel.options[ii].value == currIndex) {
                        sel.options[ii].selected = true;
                        break;
                    }
                }
            }

            sel.addEventListener('change', function () {
                var selectedOption = this.options[this.selectedIndex];
                if (selectedOption) {
                    if (selectedOption.value == -1) {
                        setValue(undefined);
                    }
                    else {
                        setValue(parseInt(selectedOption.value));
                    }
                }
                Storage.store(filters);
                updateTitleClass();
                applyFilters();
            });

            var titleEl = createElement('span', 'wmt-tvn-plc');
            titleEl.appendChild(createTextNode(levelTitle));

            var result = createElement('span');
            result.appendChild(titleEl);
            result.appendChild(sel);
            return result;
        }
        var levelDiv = createElement('div');
        levelDiv.appendChild(createLevelFilter('Уровень ГК от:', function () { return filters.levelMin; }, function (val) { filters.levelMin = val; }));
        levelDiv.appendChild(createLevelFilter('до:', function () { return filters.levelMax; }, function (val) { filters.levelMax = val; }));
        container.appendChild(levelDiv);

        var bpch = createElement('input');
        bpch.type = 'checkbox';
        if (filters.disableBadPersons == true) {
            bpch.checked = true;
        }
        bpch.addEventListener("change", function () {
            if (this.checked) {
                filters.disableBadPersons = true;
            }
            else {
                filters.disableBadPersons = undefined;
            }
            Storage.store(filters);
            updateTitleClass();
            applyFilters();
        });

        var bplb = createElement('label');
        bplb.appendChild(bpch);
        bplb.appendChild(createTextNode('Скрывать игроков в черном списке'));

        var bpDiv = createElement('div');
        bpDiv.appendChild(bplb);
        container.appendChild(bpDiv);
    }

    var setupTimeoutFilter = function (title, container) {
        container.style.width = '7em';
        var updateTitleClass = function () {
            var enabledCounter = 0;
            for (var ii = 0; ii < timeoutValues.length; ii++) {
                if (filters.timeoutEnable[timeoutValues[ii]] == true) {
                    enabledCounter++;
                }
            }
            if (enabledCounter > 0 && enabledCounter < timeoutValues.length) {
                title.className = 'wmt-tvn-ftl wmt-tvn-fte'
            }
            else {
                title.className = 'wmt-tvn-ftl';
            }
        }
        var createTimeoutFilter = function (val, getValue, setValue) {
            var ch = createElement('input');
            ch.type = 'checkbox';
            ch.checked = getValue();
            ch.addEventListener("change", function () {
                if (this.checked) {
                    setValue(true);
                }
                else {
                    setValue(undefined);
                }
                Storage.store(filters);
                updateTitleClass();
                applyFilters();
            });

            var lb = createElement('label');
            lb.appendChild(ch);
            lb.appendChild(createTextNode(val + ' сек.'));

            var div = createElement('div');
            div.appendChild(lb);
            return div;
        }
        for (var ii = 0; ii < timeoutValues.length; ii++) {
            var getVal = function (ind) {
                return function() { return filters.timeoutEnable[timeoutValues[ind]]; };
            };
            var setVal = function (ind) {
                return function (val) { filters.timeoutEnable[timeoutValues[ind]] = val; }
            }
            container.appendChild(
                createTimeoutFilter(timeoutValues[ii], getVal(ii), setVal(ii)));
        }
        updateTitleClass();
    }

    var applyFilters = function () {
        for (var ii = 0; ii < bigTable.rows.length; ii++) {
            var row = bigTable.rows[ii];
            if (filters.checkConditions(row.gc)) {
                row.style.display = '';
                if (row.gc && row.gc.joinLink && autoJoin.isEnabled() && !autoJoin.isRejectersId(row.gc.initiatorId)) {
                    autoJoin.selectedInitiatorId = row.gc.initiatorId;
                    autoJoin.store();
                    row.gc.joinLink.click();
                }
            }
            else {
                row.style.display = 'none';
            }
        }
    }

    if (bigTable.rows.length > 2) {       

        /*Create filters*/
        addStyle('.wmt-tvn-ftl { font-weight: bold; } .wmt-tvn-ftl:after { content:"\u2610"; margin-left: 5px; }\
.wmt-tvn-fte:after { content:"\u2611"; } \
.wmt-tvn-fdn { background-color: blue; }\
.wmt-tvn-ddn { position: absolute; top: 1em; left: -1em; background-color: white; border: 1px solid black; padding: 10px; display: none; }\
.wmt-tvn-ddn>div { margin-bottom: 5px; } .wmt-tvn-ddn>div:last-child { margin-bottom: 0px; } \
.wmt-tvn-ftr { position: relative; } .wmt-tvn-ftr:hover .wmt-tvn-ddn { display: inline-block; }\
.wmt-tvn-bvi { width: 5em; padding: 3px; text-align: right; }  .wmt-tvn-bvc { display: inline-block; width: 6em; text-align: right; margin-right: 5px; }\
.wmt-tvn-pli { width: 3em; padding: 3px; text-align: right; } .wmt-tvn-plc {  }\
.wmt-tvn-rej { background: black; color: white; } .wmt-tvn-rej:before { content: "#"; }');
        /*Create filters*/
        var filtersRow = bigTable.rows[firstGameRowIndex - 1];
        var insertFilter = function(index, title, setup) {
            filtersRow.cells[index].innerHTML = '';
            filtersRow.cells[index].appendChild(createFilter(title, setup));
        }
        
        insertFilter(0, 'Условия', setupSectorFilter);
        insertFilter(1, 'Игрок 1', setupPlayerFilter);
        insertFilter(2, 'Тип', setupDeckFilter);
        insertFilter(3, '\uD83D\uDD50', setupTimeoutFilter);
        insertFilter(4, 'Ставка', setupBetFilter);
        var createLink = bigTable.querySelector('a[href*="/tavern.php?form=1"]');
        if (createLink && !inBattle && !creatingGame) {

            var autoJoinInput = createElement('input');
            autoJoinInput.type = 'checkbox';
            autoJoinInput.checked = autoJoin.isEnabled();
            autoJoinInput.addEventListener("change", function () {
                if (this.checked) {
                    autoJoin.startTime = getCurrentTime();
                    autoJoin.store();
                    applyFilters();
                    setTimeout(function () { location.reload(); }, 1000);
                }
                else {
                    autoJoin.clear();
                }
                counter.update();
            });
            var lb = createElement('label');
            lb.style = 'white-space: nowrap;';
            lb.appendChild(autoJoinInput);
            var counter = createElement('span');
            counter.update = function () {
                if (autoJoin.isEnabled()) {
                    this.innerHTML = ' (' + ((autoJoin.getInterval() - (getCurrentTime() - autoJoin.startTime)) / 1000).toFixed(0) + ' сек.)';
                    setTimeout(function () { counter.update(); }, 1000);
                }
                else {
                    this.innerHTML = '';
                    if (autoJoinInput.checked) {
                        autoJoinInput.checked = false;
                    }
                }
            };
            counter.update();
            lb.appendChild(createTextNode('Автовход'));
            lb.appendChild(counter);
            createLink.parentNode.appendChild(createElement('br'));
            createLink.parentNode.appendChild(lb);
        }
        
        filtersRow.cells[0].width = 150;
        filtersRow.cells[3].width = 30;

        /*Prepare rows*/
        var ii = firstGameRowIndex;
        while (ii < bigTable.rows.length) {
            var srow = bigTable.rows[ii];
            var sectorName = srow.cells[0].textContent; 
            for (var jj = 0; jj < srow.cells[0].rowSpan; jj++) {
                var grow = bigTable.rows[ii + jj];
                if (jj > 0) {
                    var sectCell = grow.insertCell(0);                    
                    sectCell.appendChild(createTextNode(sectorName));
                }                
                grow.cells[0].className = ((ii + jj) % 2 != 0) ? 'tlight' : 'twhite';
                grow.gc = getGameConditions(grow);                
                grow.cells[0].title = getSectorTitle(grow.gc.sector.id);
                grow.cells[3].innerHTML = grow.gc.timeout;
                if (autoJoin.isRejectersId(grow.gc.initiatorId)) {
                    grow.gc.initiatorLink.className = 'wmt-tvn-rej';
                    var remBt = createElement('span', 'wmt-tvn-rjr');
                    remBt.addEventListener('click', function () {
                        autoJoin
                    });
                    grow.gc.initiatorLink.parentNode.insertBefore(remBt, grow.gc.initiatorLink);
                }
            }
            ii += srow.cells[0].rowSpan;
            srow.cells[0].rowSpan = 1;            
        }

        applyFilters();
    }
}
wmt_ph.setupBattleResult = function () {    
    addStyle('body>font { display: inline-block; padding: 0 1em; margin-bottom: 0.5em; }\
body>font[size="18"] { background: red; color: white;  }\
body>font[size="18"]:first-child { background: green; color: white;  }')
    var c = document.body;
    var fn = 0;
    for (var ii = 0; ii < c.childNodes.length; ii++) {
        if (c.childNodes[ii].nodeType != 3)
        {
            fn = ii - 1;
            break;
        }
    }
    var rl = true;
    for (var ii = c.childNodes.length - 1; ii >= 0; ii--) {
        var n = c.childNodes[ii];
        if (rl || ii <= fn) {
            c.removeChild(n);
        }
        if (n.nodeType == 3 && ~n.nodeValue.indexOf('|#f_en')) rl = false;
    }
    
}
wmt_ph.processEcostatDetails = function (xmlDoc, href) {
    if (!href && xmlDoc.location) {
        href = xmlDoc.location.href;
    }

    log('process started: ' + href );

    var t = document.querySelector('table.wb');
    if (t && t.rows.length > 1) {
        var aId = getArtifactId(href);
        if (aId) {
            var v = parseInt(t.rows[1].lastChild.textContent.replace(',', ''));
            var i = new wmt_item(aId);
            i.update();
            if (i.mapValue != v) {
                i.mapValue = v;
                i.store();
                log(JSON.stringify(i));
            }
            else {
                log('Equal value found: ' + JSON.stringify(i));

            }
        }
        else {
            log('art id is undefined');
        }
    }
    else {
        log('t is not found');
    }






}
wmt_ph.setupEcostatDetails = function () {
    /*Добавляет в таблицу предприятий сектор*/
    var tbl = document.querySelector('table.wb');
    if (tbl && tbl.rows.length > 1) {
        tbl.width = '';
        tbl.parentNode.width = '100%';

        var headRow = tbl.rows[0];
        var shc = headRow.insertCell(1);
        shc.className = 'wbwhite';
        shc.align = 'center';
        shc.innerHTML = '<b>Сектор</b>';

        var getObjId = function(row) {
            var objLink = row.cells[0].querySelector('a[href*="object-info.php?id="]');
            if (objLink) {
                return getObjectId(objLink.href);
            }
        }
        for (var ii = 1; ii < tbl.rows.length; ii++) {
            //tbl.rows[ii].cells[0].width = '';
            tbl.rows[ii].cells[0].style = 'padding: 2px 5px; white-space: nowrap; width: auto;';
            var sectorCell = tbl.rows[ii].insertCell(1);
            sectorCell.className = 'wblight';
            sectorCell.style = 'white-space: nowrap; padding: 2px 5px;';
            var objId = getObjId(tbl.rows[ii]);
            if (objId) {
                var objInfo = new ObjectInfo(objId);
                objInfo.update();
                if (objInfo.sectorId) {
                    sectorCell.innerHTML = Map.getSectorById(objInfo.sectorId).name;
                }
                else {
                    sectorCell.innerHTML = 'N/A';
                }
                
            }
            else {

            }
        }
    }
}
wmt_ph.setupPersSettings = function () {
    log(Debug_GetObjectValuesString(Settings));
    var mtb = document.querySelector('table.wbwhite');
    if (mtb) {
        addStyle('.wmt-ps-rc { vertical-align: super; display: inline-block; min-width: 3em; text-align: center; }');
        var shr = mtb.insertRow(mtb.rows.length - 3);
        var shc = shr.insertCell();
        shc.className = 'wblight';
        shc.colSpan = 2;
        shc.innerHTML = '<b>\u00A0Расширенные настройки</b>';

        var addSettingsRow = function (keyName, getValueEditorElement) {
            var row = mtb.insertRow(mtb.rows.length - 3);
            var keyCell = row.insertCell();
            keyCell.className = 'wbwhite';
            keyCell.innerHTML = '\u00A0' + keyName;
            var valueCell = row.insertCell();
            valueCell.className = 'wbwhite';
            if (getValueEditorElement) {
                valueCell.appendChild(getValueEditorElement());
            }
        }

        var addInputSettingsRow = function(inputType, setInputValue, getInputValue, keyName, keyCode, propertyCode) {
            addSettingsRow(keyName, function() {
                var el = createElement('input');
                el.type = inputType;
                var vl;
                if (propertyCode) {
                    vl = Settings[propertyCode][keyCode];
                }
                else {
                    vl = Settings[keyCode];
                }
                if (setInputValue)
                {
                    setInputValue(el, vl);
                }
                else
                {
                    el.value = vl;
                }
                
                el.addEventListener('change', function() {
                    if (getInputValue)
                    {
                        vl = getInputValue(el);
                    }
                    else
                    {
                        vl = el.value;
                    }
                    Settings.update();
                    if (propertyCode) {
                        Settings[propertyCode][keyCode] = vl;
                    }
                    else {
                        Settings[keyCode] = vl;
                    }
                    Settings.store();
                });
                return el;
            });
        }
        
        var addStringSettingsRow = function (keyName, keyCode, propertyCode) {
            var getInputValue = function(el) { if (el.value) { return el.value; } else { return undefined; } };
            var setInputValue = function(el, vl) { if (vl) { el.value = vl; } else { el.value = ''; } };
            addInputSettingsRow('text', setInputValue, getInputValue, keyName, keyCode, propertyCode);
        }

        var addNumberSettingsRow = function (keyName, keyCode, propertyCode) {
            var getInputValue = function (el) { if (el.value) { return el.value; } else { return undefined; } };
            var setInputValue = function (el, vl) { if (vl) { el.value = vl; } else { el.value = ''; } };
            addInputSettingsRow('number', setInputValue, getInputValue, keyName, keyCode, propertyCode);
        }

        var addNumericSettingsRow = function (keyName, keyCode) {
            addSettingsRow(keyName, function () {
                var el = createElement('input');
                el.type = 'number';
                el.value = Settings[keyCode];
                el.onchange = function () {
                    Settings.update();
                    Settings[keyCode] = this.value;
                    Settings.store();
                };
                return el;
            });
        }

        var addBoolSettingsRow = function (keyName, keyCode) {
            addSettingsRow(keyName, function () {
                var el = createElement('input');
                el.type = 'checkbox';
                el.checked = Settings[keyCode];
                el.onchange = function () {
                    Settings.update();
                    Settings[keyCode] = this.checked;
                    Settings.store();
                };
                return el;
            });
        }

        var addRangeSettingsRow = function (keyName, min, max, keyCode) {
            addSettingsRow(keyName, function () {
                var el = createElement('input');
                el.type = 'range';
                el.min = min;
                el.max = max;
                var vl = Settings[keyCode];
                if (vl) {
                    if (vl >= min) {
                        if (vl <= max) {
                            el.value = vl;
                        }
                        else {
                            el.value = max;
                        }
                    }
                    else {
                        el.value = min;
                    }
                }
                else {
                    el.value = min;
                }

                var str = createElement('span');
                str.className = 'wmt-ps-rc';
                str.innerHTML = el.value;

                el.onchange = function () {
                    str.innerHTML = this.value;
                    Settings.update();
                    Settings[keyCode] = this.value;
                    Settings.store();
                };

                var wrapper = createElement('div')
                wrapper.appendChild(str);
                wrapper.appendChild(el);
                return wrapper;
            });
        }

        var addSoundGainSettingRow = function (keyName) {
            addSettingsRow(keyName, function () {
                var el = createElement('input');
                el.type = 'range';
                el.autocomplete = true;
                el.min = 0;
                el.max = 100;
                var vl = Settings.soundGainValue * 100;
                if (vl) {
                    if (vl >= el.min) {
                        if (vl <= el.max) {
                            el.value = vl;
                        }
                        else {
                            el.value = el.max;
                        }
                    }
                    else {
                        el.value = el.min;
                    }
                }
                else {
                    el.value = el.max;
                }

                var str = createElement('span');
                str.className = 'wmt-ps-rc';
                var updateStr = function () {
                    str.innerHTML = el.value + '%';
                }

                el.onchange = function () {
                    Settings.update();
                    Settings.soundGainValue = this.value / 100;
                    Settings.store();
                    updateStr();
                    wmt_Sound.beep(350, 0, 100);
                };
                updateStr();

                var wrapper = createElement('div')
                wrapper.appendChild(str);
                wrapper.appendChild(el);
                return wrapper;
            });
        }

        addBoolSettingsRow('Простой вход в игру', 'useSimpleStartPage');
        addBoolSettingsRow('Компактный заголовок и меню', 'useCustomMenu');
        addBoolSettingsRow('Таймеры в меню <br><sup>(только для компактного заголовка)</sup>', 'showTimersAmongMenu');
        addSoundGainSettingRow('Громкость сигналов');
        addRangeSettingsRow("Автообновление таверны, с.", 1, 200, 'tavernRefreshDelay');
        addBoolSettingsRow('Показывать прочность одетых предметов', 'showItemsCurrentDurability');
        addStringSettingsRow('Кузнец', 'name', 'blacksmith');
        addNumberSettingsRow('Ставка, %', 'priceRate', 'blacksmith');
        addBoolSettingsRow('Скрывать охоты', 'hideHunt');
    }

}
wmt_ph.setupCgame = function () {
    wmt_Sound.playSequence('G 200, P 100, G 200, P 100, F 350');
    addStyle('.wmt-tcg-tmr { position: fixed; top: 1em; left: 1em; }')
    var timer = createElement('b', 'wmt-tcg-tmr');
    var start = getCurrentTime();
    var updateTimer = function () {
        timer.innerHTML = 'Время: ' + ((getCurrentTime() - start) / 1000).toFixed(0) + ' c.';
        setTimeout(updateTimer, 1000);
    };
    document.body.appendChild(timer);
    updateTimer();
}
wmt_ph.setupInventory = function () {    
    addStyle('.wmt-inv-tr { font-size: large; cursor: pointer; margin: 5px; }\
.wmt-inv-pf { position: absolute; top: 15em; left: 15em; z-index: 102;  background-color: white; border-style: outset; border-color: yellow; border-width: 3px;  }\
.wmt-inv-pfb { min-width: 8em; margin: 5px; }\
.wmt-inv-pfc { width: 5em; margin-left: 5px; margin-right: 15px; text-align: right; }\
.wmt-inv-pfr { width: 4em; margin-left: 5px; text-align: center; }\
.wmt-inv-arenda-item { background: #d7edd4; }\
.wmt-inv-arenda-cb { transform: scale(1.3); margin-left: -0.2rem; margin-right: 0.3rem; }\
.wmt-inv-arenda-cb:checked { transform: scale(2); }\
.wmt-inv-arenda-price { display: block; text-align: center; text-decoration: underline; cursor: pointer; }\
.wmt-inv-arenda-price:hover { transform: scale(1.1); }\
.wmt-inv-arenda-div { font-size: large; }\
.wmt-inv-arenda-recipient { margin: 1rem; font-size: inherit; width: 15rem; }\
.wmt-inv-arenda-bc {  width: 3rem; text-align: center; font-size: inherit; -moz-user-select: none; }\
.wmt-inv-arenda-bc:hover {  transform: scale(1.2); width: 4rem; }\
.wmt-inv-arenda-send { margin-left: 1rem; font-size: inherit; }');

	let updateRentDiv = function() {
		let rentDiv = document.querySelector('div.wmt-inv-arenda-div');
		if (rentDiv) {
			let ch = document.querySelectorAll('input.wmt-inv-arenda-cb:checked');
			if (ch.length) {
				//rentDiv.style.display = 'block';
				rentDiv.firstChild.focus();
				let bc = document.querySelector('.wmt-inv-arenda-bc');
				let min = 99;
				for (let ii = 0; ii < ch.length; ii++) {					
					if (ch[ii].checked 
						&& ch[ii].maxCount < min) {
						min = ch[ii].maxCount;						
					}
				}
				if (bc.value > min) {
					bc.value = min;
				}
				bc.max = min;
			}
			else {
				//rentDiv.style.display = 'none';
			}			
			
		}
	}

    /*Встраиваем оповещение о завершении работы встроенных функций*/
    let native_func = ['show_arts_by_cat', 'try_undress', 'try_dress', 'change_star1', 'change_star2', 'change_star3'];
    for (let ii = 0; ii < native_func.length; ii++) {
        let native_func_text = window.eval(native_func[ii] + '.toString();');
        let fI = native_func_text.indexOf(native_func[ii]) + native_func[ii].length;        
        native_func_text = native_func_text.substr(fI);
        let change_script = native_func[ii] + ' = function ' + native_func_text;
        let li = change_script.lastIndexOf('return');
        change_script = change_script.substr(0, li) + "postMessage('updateItems', '*');" + change_script.substr(li);        
        window.eval(change_script);
    } 

    var doTransferToRepair = function ()
    {
        if (!Settings.blacksmith.name) {
            if (confirm('Кузнец не задан в настройках. Выбрать его сейчас?')) {

                location.assign('pers_settings.php');
            }
            return;
        }

        if (confirm('Передать предмет для ремонта за 1 золотой ' + Settings.blacksmith.name + '-у')) {
            var frm = createElement('form');
            frm.method = 'post';
            frm.action = '/art_transfer.php';
            var addKey = function (k, v) { var inp = createElement('input'); inp.name = k; inp.type = 'hidden'; inp.value = v; frm.appendChild(inp); };
            addKey('nick', Settings.blacksmith.name)
            addKey('id', this.iid);
            addKey('sign', this.sign);
            addKey('art_id', '');
            addKey('sendtype', 2);
            addKey('dtime', '0.01');
            addKey('bcount', 0);
            addKey('gold', 1);
            addKey('wood', 0);
            addKey('ore', 0);
            addKey('mercury', 0);
            addKey('crystal', 0);
            addKey('gem', 0);
            addKey('sulphur', 0);
            addKey('rep', true);
            this.appendChild(frm);
            frm.submit();
        }
    }


    var addRepairBtn = function (sell) {
        var m = /sell=(\d+)&sign=(\w+)/.exec(sell.href);
        if (m) {
            var tr = createElement('span', 'wmt-inv-tr');
            tr.innerHTML = '\uD83D\uDD28';
            tr.iid = m[1];
            tr.sign = m[2];
            tr.onclick = doTransferToRepair;
            sell.parentNode.insertBefore(tr, sell);
        }
    }

	let setupArendaItem = function(sl){
		let uid = /id=(\d+)/.exec(sl.href)[1];
		
		let uidPrice = new wmt_item_rent(uid);
		uidPrice.update();
		
		let table = getNthParentNode(sl, 5);
		table.className = 'wmt-inv-arenda-item';

		let dropZone = createElement('label');
		
		let rng = document.createRange();
		rng.selectNode(table);
		rng.surroundContents(dropZone);

		let noopHandler = function(evt) {
		    evt.stopPropagation();
		    evt.preventDefault();
		}

		let drop = function (evt) {
		    evt.stopPropagation();
		    evt.preventDefault();
		    let chatNick = getChatNick(evt.dataTransfer.getData('Text'));
		    if (chatNick) {
		        let cb = this.querySelector('.wmt-inv-arenda-cb');
		        if (cb) {
		            cb.checked = true;
		            updateRentDiv();
		        }
		        let rec = document.querySelector('.wmt-inv-arenda-recipient');
		        if (rec) {
		            rec.value = chatNick;
		            let sbt = document.querySelector('.wmt-inv-arenda-send');
		            if (sbt) {
		                sbt.disabled = undefined;
		            }
		        }		        
		    }
		}

		

		let itemLink = table.querySelector('a[href*="art_info.php?id="]');
		if (!itemLink) {
			return;
		}
		
		let artId = getArtifactId(itemLink.href);
		if (!artId) {
			return;
		}
		
		let maxCount = /(\d+)\/\d+/.exec(sl.parentNode.previousSibling.textContent)[1];
		
		let groupPrice = new wmt_item_rent(artId);		
		groupPrice.update();
		
		let price = createElement('span', 'wmt-inv-arenda-price');
		if (uidPrice.value) {			
			price.innerHTML = '\u2460' + uidPrice.value;
			price.style.color = 'blue';
			price.title = 'Цена боя для сдачи в аренду именно этого предмета';
			price.value = uidPrice;
		}
		else if (groupPrice.value) {			
			price.innerHTML = '\u2460' + groupPrice.value;
			price.style.color = 'green';
			price.title = 'Цена боя для сдачи в аренду всех таких предметов';
			price.value = groupPrice;
		}
		else {
			price.innerHTML = 'Цена?';	
			price.style.color = 'red';
			price.title = 'Задать стоимость боя для сдачи в аренду';
		}			
			
		table.rows[0].cells[0].appendChild(price);
		
		let checkBox = createElement('input', 'wmt-inv-arenda-cb');
		checkBox.type = 'checkbox';
		checkBox.uid = uid;
		checkBox.maxCount = parseInt(maxCount);
		checkBox.price = price.value;
		checkBox.addEventListener('change', updateRentDiv);
		itemLink.parentNode.insertBefore(checkBox, itemLink);
		checkBox.disabled = !uidPrice.value && !groupPrice.value;
		
		if (!checkBox.disabled) {
		    dropZone.addEventListener('dragenter', noopHandler, false);
		    dropZone.addEventListener('dragexit', noopHandler, false);
		    dropZone.addEventListener('dragover', noopHandler, false);
		    dropZone.addEventListener('drop', drop, false);
		}
		
		price.addEventListener('click', function() {
			let newPrice = parseInt(prompt('Введите стоимость боя'));
			if (newPrice) {
				if (confirm('Использовать для всех таких предметов?')) {
					groupPrice.value = newPrice;
					uidPrice.value = undefined;
				}
				else {
					groupPrice.value = undefined;
					uidPrice.value = newPrice;
				}
				groupPrice.store();
				uidPrice.store();
			}
		});
	}
	
    var prepareItems = function () {
        //var ul = document.querySelectorAll('a[onclick*="try_undress"]');
        //for (var ii = 0; ii < ul.length; ii++) {
        //    ul[ii].m = /try_undress\((\d+)\)/.exec(ul[ii].onclick.toString());
        //    ul[ii].removeAttribute('onclick');
        //    ul[ii].onclick = function () { if (this.m) { b(this.m[1]); } };
        //}
        //var dl = document.querySelectorAll('a[onclick*="try_dress"]');
        //for (var ii = 0; ii < dl.length; ii++) {
        //    dl[ii].m = /try_dress\((\d+)\)/.exec(dl[ii].onclick.toString());
        //    dl[ii].removeAttribute('onclick');
        //    dl[ii].onclick = function () { if (this.m) { c(this.m[1]); } };
        //}
        //let cs = document.querySelectorAll('a[onclick*="change_star"]');
        //for (let ii = 0; ii < cs.length; ii++) {
        //    cs[ii].m = /change_star(\d)\((\d+),\s(\d+)\)/.exec(cs[ii].onclick.toString());
        //    cs[ii].removeAttribute('onclick');
        //    cs[ii].onclick = function () { if (this.m) { change_star(this.m[1], this.m[2], this.m[3]); } };
        //}
		var sl = document.querySelectorAll('a[href*="art_transfer.php?id="]');
		for (var ii = 0; ii < sl.length; ii++) {
			setupArendaItem(sl[ii]);
		}		

        var drops = document.querySelectorAll('a[href*="inventory.php?sell="]');
        for (var ii = 0; ii < drops.length; ii++) {
            addRepairBtn(drops[ii]);
        }
    }
    let lastUpdateTime;
    var updateItems = function () {
        if (!lastUpdateTime || (getCurrentTime() - lastUpdateTime) > 100) {
            prepareItems();
            showItemsCurrentDurability();
        }
        lastUpdateTime = getCurrentTime();        
    }

    window.addEventListener('message', function (ev) {
        if (ev.data == 'updateItems') {            
            updateItems();
            return true;
        }
    }, false);

    var showRepairPayForm = function (t) {
        var t = this;
        
        var itemView = t.parentNode.parentNode.previousSibling.firstChild.firstChild;
        var itemLink = t.parentNode.parentNode.previousSibling.querySelector('a[href*="art_info.php"]');
        var itemId = getArtifactId(itemLink.href);
        var item = new wmt_item(itemId);
        item.update();
        if (item.repair == undefined) {
            location.assign('art_info.php?id=' + item.id);
            return;
        }

        var itemName = t.parentNode.parentNode.previousSibling.previousSibling.firstChild.firstChild.textContent.replace(/(^'|'$)/g, '');

        var receiver = t.parentNode.parentNode.previousSibling.previousSibling.firstChild.lastChild.textContent;

        
        var bgnd = getBackgroundDiv();
        bgnd.style = 'display: block; z-index: 101;';

        var header = createElement('h4');
        header.style = 'text-align: center;';
        header.innerHTML = 'Оплата ремонта за ' + itemName;

        var headerDiv = createElement('div');
        headerDiv.appendChild(header);

        var transferForm = createElement('form');
        transferForm.action = '/transfer.php';
        transferForm.method = "post";

        var addInputLabel = function (caption, name, value, width) {
            var input = createElement('input');
            input.type = 'text';
            input.name = name;
            input.value = value;
            input.style.width = width;
            var span = createElement('span');
            span.style = 'display: inline-block; min-width: 8em;';
            span.appendChild(createTextNode(caption));
            var label = createElement('label');
            label.style = 'display: block; margin: 5px;';
            label.appendChild(span);
            label.appendChild(input);
            transferForm.appendChild(label);
            return input;
        }

        var addHiddenInput = function (name, value) {
            var input = createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            transferForm.appendChild(input);
            return input;
        };

        addInputLabel('Получатель', 'nick', receiver, '8em;');
        var gold = addInputLabel('Сумма', 'gold', '?', '5em');

        addHiddenInput('wood', 0);
        addHiddenInput('ore', 0);
        addHiddenInput('mercury', 0);
        addHiddenInput('sulphur', 0);
        addHiddenInput('crystal', 0);
        addHiddenInput('gem', 0);
        addHiddenInput('sign', OwnInfo.transferSign);

        var desc = addInputLabel('Описание', 'desc', '?', '40em');
        
        var submit = createElement('input', 'wmt-inv-pfb');
        submit.type = 'submit';
        submit.value = 'OK';

        var cancel = createElement('input', 'wmt-inv-pfb');
        cancel.type = 'button';
        cancel.value = 'Отмена';

        var toolDiv = createElement('div');
        toolDiv.style = 'text-align: right; padding: 5px;';
        
        toolDiv.appendChild(cancel);
        toolDiv.appendChild(submit);

        transferForm.appendChild(toolDiv);

        var repairSpan = createElement('span');
        repairSpan.innerHTML = 'Цена ремонта:';

        var repair = createElement('input', 'wmt-inv-pfc');
        repair.type = 'text';
        repair.value = item.repair;

        var defaultRate = 100;
        if (Settings.blacksmith.priceRate) {
            defaultRate = Settings.blacksmith.priceRate;
        }

        var rateSpan = createElement('span');
        rateSpan.innerHTML = 'Ставка:';

        var rate = createElement('input', 'wmt-inv-pfr');
        rate.type = 'number'
        rate.value = defaultRate;

        var refDiv = createElement('div');
        refDiv.style = 'display: inline-block; padding: 5px 15px;';
        refDiv.appendChild(repairSpan);
        refDiv.appendChild(repair);
        refDiv.appendChild(rateSpan);
        refDiv.appendChild(rate);

        gold.parentNode.appendChild(refDiv);

        var frmBorder = createElement('div', 'wmt-inv-pf');
        var link = itemView.cloneNode(true);
        link.style = 'float: right; margin-right: 1em; margin-top: 1em;'
        frmBorder.appendChild(link);

        frmBorder.appendChild(headerDiv);

        frmBorder.appendChild(transferForm);

        document.body.appendChild(frmBorder)

        var updateGoldValue = function () {
            var r = rate.value;
            var rep = repair.value;
            gold.value = Math.ceil(rep * r / 100) + 1;            
        };

        var updateDescValue = function () {
            var r = rate.value;
            desc.value = 'Ремонт: ' + itemName + ' (' + r + '% + 1з.)';
        };        

        var hideAll = function () { bgnd.style = ''; frmBorder.parentNode.removeChild(frmBorder); };

        bgnd.addEventListener('click', hideAll);
        cancel.addEventListener('click', hideAll);
        repair.addEventListener('change', function () {
            if (this.value) {
                updateGoldValue();
            }
            else {
                this.value = item.repair;
            }
        })
        rate.addEventListener('change', function () {
            var num = parseInt(this.value);
            if (num > 0 && num < 150) {
                updateGoldValue();
                updateDescValue();
            }
            else {
                this.value = defaultRate;
            }
        });

        updateGoldValue();
        updateDescValue();
    };

    /*Prepare tabs*/
    //var ts = document.querySelectorAll('a[id*="ln"]');
    //for (var ii = 0; ii < ts.length; ii++) {
    //    ts[ii].m = /show_arts_by_cat\('(\w*)',\s+(\d+)\)/.exec(ts[ii].onclick.toString());
    //    ts[ii].removeAttribute('onclick');
    //    ts[ii].onclick = function () { a(this.m[1], +this.m[2]); }
    //}

    /*Prepare transfers*/
    var tr = document.querySelectorAll('a[href*="trade_cancel.php?tid="]');
    if (tr.length)
    {
        addStyle('.wmt-inv-prs { cursor: pointer; display: inline-block; margin-right: 10px; font-weight: bold; text-decoration: underline; }\
.wmt-inv-pfd { margin: 5px; } .wmt-inf-pfk { display: inline-block; min-width: 15em; }')
        for (var ii = 0; ii < tr.length; ii++) {
            var dr = tr[ii].parentNode.parentNode.previousSibling;
            var dc = dr.cells[1];
            if (/Ремонт\sразрешен/.test(dc.textContent)) {
                var el = createElement('span', 'wmt-inv-prs');
                el.appendChild(createTextNode('Оплатить ремонт'));
                //el.itemLink = dr.parentNode.querySelector('a[href*="art_info.php?id="]');
                tr[ii].parentNode.insertBefore(el, tr[ii]);
                /*var closure = function (_el) { return function () { showRepairPayForm(_el); } };
                el.onclick = closure(el);*/
                el.onclick = showRepairPayForm;


                /*var itemLink = xxx;
                if (itemLink) {
                    var item = new wmt_item();
                    item.update();
                    if (item.name && item.repair) {
                        el.item = item;
                        el.addEventListener('click', closure(el));
                    }
                    else {
                        el.addEventListener('click', function () { itemLink.click(); });
                    }
                }*/

                /*var targetLink = dr.parentNode.querySelector('a[href*="pl_info.php"]');
                if (targetLink) {
                    el.receiver = targetLink.textContent;
                    var nameB = targetLink.parentNode.querySelector('b');
                    if (nameB) { el.itemName = nameB.textContent.replace(/'/g, ''); }
                }*/

            }
        }
    }

	let recipient = createElement('input', 'wmt-inv-arenda-recipient');
	recipient.placeholder = 'Введите имя получателя';
	
		
	let bCount = createElement('input', 'wmt-inv-arenda-bc');
	bCount.type = 'number';
	bCount.value = 1;
	bCount.min = 1;
	bCount.max = 99;
	bCount.title = 'Количество боев';
	/*bCount.addEventListener('dblclick', () => {
		bCount.value = parseInt(bCount.value) + 1;
	})*/

	let sendCheckedItem = function() {
		let cb;
		let cbAll = document.querySelectorAll('input.wmt-inv-arenda-cb');
		for (let ii = 0; ii < cbAll.length; ii++) {
			if (cbAll[ii].checked) {
				cb = cbAll[ii];				
				cbAll[ii].checked = false;				
				break;
			}
		}
		
		if (!cb) {
			location.reload();
			return;
		}
		
		var trans=[];
		var snart=[];
		for(var i=0x410;i<=0x44F;i++)
		{
			trans[i]=i-0x350;
			snart[i-0x350] = i;
		}
		trans[0x401]= 0xA8;
		trans[0x451]= 0xB8;
		snart[0xA8] = 0x401;
		snart[0xB8] = 0x451;
		let urlencode = function(str)
		{
			var ret=[];
			for(var i=0;i<str.length;i++)
			{
				var n=str.charCodeAt(i);
				if(typeof trans[n]!='undefined')
				n = trans[n];
				if (n <= 0xFF)
				ret.push(n);
			}

			return escape(String.fromCharCode.apply(null,ret));
		}

		
		let data = 'id=' + cb.uid 
		
		+ '&nick=' + urlencode(recipient.value.trim()) 
		+ '&gold=' + cb.price.value * bCount.value
		+ '&wood=0&ore=0&mercury=0&sulphur=0&crystal=0&gem=0&sendtype=2'
		+ '&dtime=' + (parseInt(bCount.value) * 0.05)
		+ '&bcount=' + bCount.value 
		+ '&art_id=&sign=' + OwnInfo.transferSign;
		log(data);
		GM_xmlhttpRequest({
			method: 'POST',
			url: '/art_transfer.php',
			data: data,
			onload: (r) => {
				log(r.readyState);
				setTimeout(sendCheckedItem, 500); 
			},
			headers: {
				"Content-Type": "application/x-www-form-urlencoded"
			},
            overrideMimeType: 'text/html;charset=windows-1251'
		});		
	}
	
	let sendSelected = function () {
		sendCheckedItem();
	}	
	
	let rentBtn = createElement('button', 'wmt-inv-arenda-send');
	rentBtn.innerHTML = 'Сдать в аренду';
	rentBtn.disabled = true;
	rentBtn.addEventListener('click', sendSelected);
		
	let arendaDiv = createElement('div', 'wmt-inv-arenda-div');
	
	arendaDiv.appendChild(recipient);
	arendaDiv.appendChild(createTextNode('#'));
	arendaDiv.appendChild(bCount);
	arendaDiv.appendChild(rentBtn);
	
	recipient.oninput = function() {
		rentBtn.disabled = !recipient.value.trim();
		let chatNick =  getChatNick(recipient.value);
		if (chatNick) {
			recipient.value = chatNick;
		}
	}
	
	let test = document.querySelector('div#test');
	if (test) {	
		test.parentNode.insertBefore(arendaDiv, test);
	}
	
    updateItems();
}
wmt_ph.processInventory = function (xmlDoc) {
    var dropLink = xmlDoc.body.querySelector('a[href*="inventory.php?sell=235086379"]');
    if (dropLink) {
        OwnInfo.update();
        var m = /&sign=(\w+)/.exec(dropLink.href);
        if (m && m[1] != OwnInfo.transferSign) {
            OwnInfo.transferSign = m[1];
            OwnInfo.store();
        }
    }
}
wmt_ph.processTransfer = function (xmlDoc) {
    var signInput = xmlDoc.body.querySelector('input[name="sign"]');
    if (signInput)
    {
        OwnInfo.update();
        if (signInput.value != OwnInfo.transferSign)
        {
            OwnInfo.transferSign = signInput.value;
            OwnInfo.store();
        }
    }
}
wmt_ph.setupSkillWheelDemo = function () {
    var obj = getFlashObjectByMovie('skillwheel.swf');
    if (obj) {
        var cf = 1; cc = 0;
        var m = /f=(\d+)(?:&c=(\d+))?/.exec(location.href);
        if (m) {
            cf = m[1];
            cc = m[2] || 0;
        }
        addStyle('.wmt-swh-anc { margin-left: 3px; } .wmt-swh-anc[title] { text-transform: capitalize; }');
        var root = obj.parentNode.parentNode.previousSibling;
        var addRaceLink = function (f, c) {
            var img = createElement('img');
            img.src = wmt_Faction.getIconUrl(f, c);
            if (f == cf && c == cc) {
                img.height = 30;
            }
            var link = createElement('a', 'wmt-swh-anc');
            link.href = 'skillwheel_demo.php?f=' + f + '&c=' + c;
            link.appendChild(img);
            link.title = wmt_Faction.getName(f, c);            
            root.appendChild(link);
        }
		wmt_Faction.items.forEach(function(item) {
			addRaceLink(item[0], item[1])
		})
    }
}
wmt_ph.setupCastle = function () {
    var ownLevel = 14;
    var factionId = 0;
    var m = /show_for=(\d+)/.exec(location.href);
    if (m) {
        factionId = +m[1];
    }
    else {
        //or myFaction		
        var options = document.querySelectorAll('select[name="fract"] option');
		factionId = options.length;
        for (var ii = 0; ii < options.length; ii++) {
            var n = parseInt(options[ii].value);
            if (n > 0 && n != ii) {
                factionId = ii;
                break;
            }
        }
    }
	
    var upg = /show_upg=1/.test(location.href);

    var castle = {
        faction: {},
        addCostTo: function (total, fId, condition) {
            if (!total || ! this.faction[fId]) return;
            this.faction[fId].forEach(function (b) {
                if (!condition || condition(b)) {
                    for (var r in b.cost) {
                        if (total[r] == undefined) { total[r] = 0; }
                        total[r] += b.cost[r];
                    }
                }
            });
        },
        getTotal: function (f, condition) {
            var result = { };           
            if (f) {
                this.addCostTo(result, f, condition);
            }
            else {
                for (var n in this.faction) {
					if (n > 0) {
						this.addCostTo(result, n, condition);	
					}                    
                }
            }
            return result;
        },
        add: function (n, l, c, b, a) {
            if (!this.faction[factionId]) {
                this.faction[factionId] = [];
            }
            var d = { name: n, level: l, cost: c, isConstructed: b };
            if (upg)
            {
                d.isUpgrade = true;
                if (a)
                {
                    d.isArmyUp = true;
                }
            }
            this.faction[factionId].push(d)
        },
        update: function () {
            Storage.update(this);
            if (this.faction[factionId]) {
                /*Очистка сохраненных данных для этой страницы*/
                var s = [];
                for (var ii = 0; ii < this.faction[factionId].length; ii++) {
                    if ((this.faction[factionId][ii].isUpgrade || false) != upg) {
                        s.push(this.faction[factionId][ii]);
                    }
                }
                this.faction[factionId] = s;
            }
        },
        store: function () { Storage.store(this); },
        getStorageKey: function () { return "wmt_castle" }
    };
    castle.update();
    

    var cl = document.querySelector('table.wb td:first-child');
    if (cl)
    {
        var br = cl.parentNode.nextSibling.lastChild;

        var rows = br.querySelectorAll('tr[bgcolor]');
        for (var ii = 0; ii < rows.length; ii++) {
            var name = rows[ii].querySelector('b').textContent;
            var isConstructed = rows[ii].bgColor == "#FFFFFF";
            var lev = 0;
            var price = {};
            var isArmyUp = false;
            var nr = rows[ii].nextSibling;
            while (nr && nr.id) {
                var key;
                if (nr.firstChild) {                    
                    key = nr.firstChild.textContent;
                }
                if (~key.indexOf('Стоимость') && getTotalPrice(price) == 0) {
                    var priceTable = nr.lastChild.firstChild.firstChild;
                    price = getResourcesPrice(priceTable);
                    if (price && priceTable.rows[0].cells.length > 2) {
                        var tc = priceTable.insertRow().insertCell();
                        tc.colSpan = priceTable.rows[0].cells.length;
                        tc.align = 'center';
                        tc.innerHTML = '<b>\u2211</b>\u00A0' + getSeparatedValue(getTotalPrice(price));
                    }
                }
                else if (~key.indexOf('Уровень') && lev == 0) {
                    lev = parseInt(nr.lastChild.textContent);
                }
                else if (upg && nr.querySelector('a[href*="army_info.php?name="]')) {
                    isArmyUp = true;
                }
                nr = nr.nextSibling;
            }
            castle.add(name, lev, price, isConstructed, isArmyUp);            
        }
        castle.store();		

        var valueDiv = createElement('div', 'wmt-cst-vd');
        addStyle('.wmt-cst-vd { text-align: left; }');
        var insertCostTable = function (title, price) {
            var resOrder = ['gold', 'wood', 'ore', 'mercury', 'sulfur', 'crystal', 'gem'];
            var getIndex = function (r) {
                for (var ii = 0; ii < resOrder.length; ii++) {
                    if (resOrder[ii] == r) {
                        return ii;
                    }
                }
            }

            var result = valueDiv.querySelector('table.wmt-cst-ct');
            if (!result) {
                result = createElement('table', 'wmt-cst-ct');
                addStyle('.wmt-cst-ct { width: 100%; } .wmt-cst-hc { text-align: right; width: 3em; } .wmt-cst-rc { text-align: right; padding: 3px;  }\
.wmt-cst-sr { font-weight: bold;  padding-top: 1.5em; }');
                var head = result.insertRow();
                head.insertCell().innerHTML = "<b>Потраченые ресурсы:</b>";
                for (var key in resOrder) {
                    var himg = createElement('img');
                    himg.src = '/i/' + resOrder[key] + '.gif';
                    var hcell = head.insertCell();
                    hcell.appendChild(himg);
                    hcell.className = 'wmt-cst-hc';
                }
                var htc = head.insertCell();
                htc.appendChild(createTextNode("\u2211"));
                htc.style.textAlign = 'center';
            }

            var row = result.insertRow();
            var hc = row.insertCell();
            hc.appendChild(createTextNode(title));
            if (price) {
                hc.className = 'wmt-cst-rc';
                for (var k in resOrder) {
                    row.insertCell().className = 'wmt-cst-rc';
                }
                var tcell = row.insertCell();
                tcell.className = 'wmt-cst-rc';
                tcell.appendChild(createTextNode(getSeparatedValue(getTotalPrice(price))));

                for (var key in price) {
                    var index = getIndex(key);
                    if (index == undefined) {
                        log('Unexpected resource index: ' + key);
                        continue;
                    }

                    var vb = createElement('span');
                    vb.appendChild(createTextNode(getSeparatedValue(price[key])));
                    row.cells[index + 1].appendChild(vb);
                }
            }
            else {
                hc.colSpan = 9;
                hc.className = 'wmt-cst-sr';
            }
            return result;
        }

        var isConstructed = function (b) { return b.isConstructed; }
        var isNotConstruction = function (b) { return !b.isConstructed; }
        var isNotConstructionByLevelFull = function (b) { return isNotConstruction(b) && ownLevel >= b.level; }
        var isNotConstructionByLevelArmyOnly = function (b) { return isNotConstructionByLevelFull(b) && (b.isUpgrade == undefined || b.isArmyUp == true); }
        var isNotConstructionByLevelMin = function (b) { return isNotConstructionByLevelFull(b) && b.isUpgrade == undefined; }
        
        valueDiv.appendChild(insertCostTable("на этот замок:", castle.getTotal(factionId, isConstructed)));
        valueDiv.appendChild(insertCostTable("на все замки:", castle.getTotal(undefined, isConstructed)));
        valueDiv.appendChild(insertCostTable('Требующиеся ресурсы (этот замок):'));
        valueDiv.appendChild(insertCostTable('всего',  castle.getTotal(factionId)));
        valueDiv.appendChild(insertCostTable('осталось', castle.getTotal(factionId, isNotConstruction)));
        valueDiv.appendChild(insertCostTable('до уровня ' + ownLevel + ':', castle.getTotal(factionId, isNotConstructionByLevelFull)));
        valueDiv.appendChild(insertCostTable('(улучшения армии):', castle.getTotal(factionId, isNotConstructionByLevelArmyOnly)));
        valueDiv.appendChild(insertCostTable('(без улучшений):', castle.getTotal(factionId, isNotConstructionByLevelMin)));
        valueDiv.appendChild(insertCostTable('Требующиеся ресурсы (все замки):'));
        valueDiv.appendChild(insertCostTable('всего', castle.getTotal()));
        valueDiv.appendChild(insertCostTable('осталось', castle.getTotal(undefined, isNotConstruction)));
        valueDiv.appendChild(insertCostTable('до уровня ' + ownLevel + ':', castle.getTotal(undefined, isNotConstructionByLevelFull)));
        valueDiv.appendChild(insertCostTable('(улучшения армии):', castle.getTotal(undefined, isNotConstructionByLevelArmyOnly)));
        valueDiv.appendChild(insertCostTable('(без улучшений):',
            castle.getTotal(undefined, isNotConstructionByLevelMin)));
        cl.parentNode.nextSibling.firstChild.appendChild(valueDiv);
    }
}
wmt_ph.setupTask = function(){
	var tasks = document.querySelectorAll('img[src*="tasks/g3.jpg"]');
	for (var ii = 0; ii < tasks.length; ii++) {
		tasks[ii].parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.style.display = "none";
	}
	var subMits = document.querySelectorAll('form[action*="task_guild.php"]>input[type="submit"][value*="Улучшить"]')
	for (var ii = 0; ii < subMits.length; ii++) {
       
		subMits[ii].parentNode.parentNode.innerHTML = '<b style="color: green">Выполнено</b>';
	}
}
wmt_ph.processShowPerkInfo = function() {
	var m = /name=(.+)/.exec(location.href);
	if (!m ||m.length < 2){
		log('name is not found: ' + location.href);
		return;			
	}
	var code = m[1].toLowerCase().trim();
	if (!code) {
		log('code not found');
		return;
	}
	
	
	var nc = document.querySelector('table.wbwhite>tbody>tr:first-child');
	if (!nc){
		log('name cell is not found');
		return;
	}
	
	var nca = nc.textContent.split(':');
	if (!nca || nca.length < 2){
		log('Unexpected name cell format: "' + nc.textContent + '"');
		return;
	}
	
	var name = nca[1].trim();
	if (!name){
		log('Incorrect name');
		return;
	}	
	
	var dc = document.querySelector('table.wbwhite>tbody>tr:nth-child(2)>td:nth-child(2)');
	if (!dc){
		log('description cell is not found');
		return;
	}
	
	var desc = dc.childNodes[dc.childNodes.length - 1].nodeValue;
	if (!desc){
		log('Description is not found');
		return;
	}
	 
	var perk = new wmt_perk(code, name, desc);
	perk.store();		
}
wmt_ph.setupShop = function(){

	/*collapse details*/
	addStyle('.wmt-shop-table { vertical-align: top; }\
.wmt-shop-table>br { display: none; }\
.wmt-shop-table>table { display: none; }\
.wmt-shop-table>font { color: black; margin-bottom: 1em; font-size: large !important; }\
.wmt-shop-icon-panel { width: 100%; padding: 1em; }\
.wmt-shop-item-icon { display: inline-block; width: 50px; height: 50px; cursor: pointer; }\
.active { height: 46px; width: 46px; border: 2px solid yellow; }');	
	var td = document.querySelector('table.wb>tbody>tr:last-child>td:first-child');
	if (!td)
	{
		log('td is not found');
		return;
	}
	var row = td.parentNode;
	row.removeChild(td);
	row.appendChild(td);
	var hc = row.previousSibling.lastChild;
	row.previousSibling.removeChild(hc);
	row.previousSibling.insertBefore(hc, row.previousSibling.firstChild);
	var lastIcon;
	td.className += ' wmt-shop-table';
	var itemTable = td.querySelectorAll('table.wb');
	var iconPanel = document.createElement('div');
	iconPanel.className = 'wmt-shop-icon-panel';
	for (var ii = 0; ii < itemTable.length; ii++){	
		var icon = document.createElement('img');
		icon.className = 'wmt-shop-item-icon';		
		icon.table = itemTable[ii];
		icon.title = itemTable[ii].firstChild.firstChild.textContent.trim();
		icon.addEventListener('click', function() {
			if (lastIcon != this) {
				if (lastIcon) {
					lastIcon.className = 'wmt-shop-item-icon';
					lastIcon.table.style.display = 'none';
				}
				lastIcon = this;
				lastIcon.className = 'wmt-shop-item-icon active';
				lastIcon.table.style.display = 'inline-block';					 
			}				
		})
		iconPanel.appendChild(icon);
		var img = itemTable[ii].querySelector('img');
		if (img) {
			if (/transparent\.gif/.test(img.src))
			{
				icon.src = getNthParentNode(img, 5).getAttribute('background');	
			}
			else
			{
				icon.src = img.src;	
			}			
		}
		else{
			log('no img');
		}
		if (!lastIcon){
			icon.click();			
		}						
	}
	td.appendChild(iconPanel);
	
}
wmt_ph.setupWar = function() {	
	wmt_Sound.beep();
	
	var warId = /warid=(\d+)/i.exec(location.href)[1];
	
	var handleBattleResponse = function(r) {		
		if (r.readyState == 4 && r.status == "200") {
			if (~r.responseText.indexOf('Defeated:')){
				onBattleEnd(r);				
			}
			else {				
				requestBattle();
			}			
		}		
	}
	
	var requestBattle = function() {
		log('request battle ' + warId);
		setTimeout(function() {
			GM_xmlhttpRequest({					 
				url: '/battle.php?lastturn=-1&warid=' + warId,
				method: 'GET',
				headers: { "Referer": location.href, "DNT": "1" },                
                onload: handleBattleResponse
			});
		}, 5000)
	}
	
	/*Вызывается когда бой заканчивается*/
	var onBattleEnd = function(xmlDoc) {		
		if (OwnInfo.Mercenary.Autopilot) {
			location.assign('/map.php');
		}		
	}
	
	/*Запуск определения окончания боя*/
	if (OwnInfo.Mercenary.Autopilot && OwnInfo.Mercenary.Task) {
		document.title = wmt_MT.toString(OwnInfo.Mercenary.Task);
		requestBattle();	
	}	
}
wmt_ph.setupPlstatsMerc = function () {
	addStyle('.wmt-stat-merc { display: block; } .wmt-stat-merc.wrong { font-weight: bold; }')
	var link = document.querySelectorAll('a[href*="warlog"]');
	for (let ii = 0; ii < link.length; ii++) {
		var task = wmt_MT.parse(link[ii].textContent);
		if (task) {
			var taskSpan = createElement('span', 'wmt-stat-merc');
			taskSpan.innerHTML = wmt_MT.toString(task);
			taskSpan.title = JSON.stringify(task);
			if (link[ii].textContent != taskSpan.innerHTML) {
				taskSpan.className += ' wrong';
			}
			link[ii].parentNode.appendChild(taskSpan);			
		}
		else {
			//
		}
	}
}
wmt_ph.setupSearch = function () {
    let sectorIndex, district, player_id, startTime, sectorObjects, lastObjectIndex;
    addStyle('.work-search { margin-left: 2rem; }');
    let resultContainer = createElement('div', 'work-search');
    let startWorkSearch = createElement('button');
    startWorkSearch.appendChild(createTextNode('Поиск рабочих мест'));
    startWorkSearch.addEventListener('click', () => {
        let playerInput = document.querySelector('input[name="key"]');
        if (playerInput) {
            player_id = parseInt(playerInput.value);            
        }
        if (!player_id) {
            player_id = wmt_page.playerId;
        }
        shifts.innerHTML = '';
        startWorkSearch.disabled = true;
        sectorIndex = 0;
        district = -1;
        startTime = getCurrentTime();
        requestSector();
    })
    let shifts = createElement('textarea');
    resultContainer.appendChild(startWorkSearch);
    resultContainer.appendChild(createElement('br'));
    resultContainer.appendChild(shifts);
    document.body.appendChild(resultContainer);    

    let handleMapSector = (r) => {
        if (r.status == "200" && r.readyState == "4") {
            let xDoc = parseXmlDoc(r.responseText);
            let objects = xDoc.querySelectorAll('table.wb a[href*="object-info.php?id="]');
            sectorObjects = [];
            for (let ii = 0; ii < objects.length; ii++) {
                let m =  /\?id=(\d+)/.exec(objects[ii].href);
                if (m && m[1]
                    && !sectorObjects.includes(m[1])) {
                    sectorObjects.push(m[1]);
                }
            }
            log('Sector #' + sectorIndex + ' District ' + district + ' has ' + sectorObjects.length + ' following objects ' + JSON.stringify(sectorObjects));
            lastObjectIndex = -1;
            setTimeout(requestObjectWorkers, 1000);
        }        
    }

    let getSectorUrl = () => {
        let s = Map.sectors[sectorIndex];
        let st = (district > 1) 
            ? 'sh'
            : (district > 0 ? 'fc' : 'mn');
        return '\map.php?cx=' + s.x + '&cy=' + s.y + '&st=' + st;
    };

    let requestSector = () => {
        if (district < 2) {
            district += 1;
        }
        else {
            district = 0;
            sectorIndex += 1;
        }
        
        if (sectorIndex >= Map.sectors.length) {
            //The end
            startWorkSearch.disabled = false;
            startWorkSearch.innerHTML = 'Начать новый поиск';
            resultContainer.appendChild(createTextNode('Поиск закончен за ' + Math.floor((getCurrentTime() - startTime) / 1000) + ' секунд.'));
        }
        else {
            startWorkSearch.innerHTML = 'Поиск завершен на ' + (100 * sectorIndex / Map.sectors.length).toFixed(1) + '%';
            GM_xmlhttpRequest({
                method: 'GET',
                url: getSectorUrl(),
                onload: handleMapSector
            });
        }
    }

    let requestObjectWorkers = () => {
        lastObjectIndex += 1;
        if (lastObjectIndex < sectorObjects.length) {
            objectId = sectorObjects[lastObjectIndex];
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'http://www.heroeswm.ru/objectworkers.php?id=' + objectId,
                onload: handleObjectWorkers
            });
        }
        else {
            setTimeout(requestSector, 1000);
        }        
    };

    let handleObjectWorkers = (r) => {
        if (r.status == "200" && r.readyState == "4") {
            let xDoc = parseXmlDoc(r.responseText);
            let pl_info = xDoc.querySelectorAll('a.pi[href*="pl_info.php?id=' + player_id + '"]');
            log('object #' + objectId + ' = ' + pl_info.length)
            if (pl_info.length > 0) {
                shifts.appendChild(createTextNode('#' + objectId + '\r\n'));                
                for (let ii = 0; ii < pl_info.length; ii++) {                    
                    let m = /\d{2}-\d{2}-\d{2} \d{2}:\d{2}/.exec(pl_info[ii].parentNode.textContent);
                    if (m) {
                        shifts.appendChild(createTextNode(' ' + m[0] + '\r\n'));                        
                    }
                }                
            }
        }
        setTimeout(requestObjectWorkers, 1000);
    }
}

wmt_ph.setupSmsCreate = function () {
    if (location.hash) {
        var hashParam = decodeURIComponent(location.hash).substring(1).split('|');
        for (var ii = 0; ii < hashParam.length; ii++) {
            if (!hashParam[ii]) continue;
            if (ii == 0) {
                let inp = document.querySelector('input[name="subject"]');
                if (inp) {
                    inp.value = hashParam[ii];
                }
                else {
                    log('Can not find input with the name "subject"');
                }
            }
            else if (ii == 1) {
                let ta = document.querySelector('textarea[name="msg"]');
                if (ta) {
                    ta.innerHTML = hashParam[ii];
                }
                else {
                    log('Can not find textarea with the name "msg"');
                }
            }
            else {
                log('Unsupported hash param #' + ii);
            }
        }
    }
}

wmt_ph.setupSms = function () {
    

    let ip = document.querySelector('form[action="sms.php"] input[name="search_nik"]');
    if (ip) {
        let tbl = getNthParentNode(ip, 4);
        if (tbl) {
            var pageSettings = {
                enabled: false,
                from: undefined,
                lastId: undefined,
                getStorageKey: function () { return 'smssettngs_' + wmt_page.playerId; },
                store: function () { Storage.store(this); },
                update: function () { Storage.update(this); }

            };

            let reloadTimeout;

            let checkUpdates = () => {
                //сравнить максимальный sms_id с последним pageSettings.lastId
                // если max_sms_id > pageSettings.lastId то pageSettings.lastId = max_sms_id и гудим
                reloadTimeout = setTimeout(() => location.reload(), 45000);
            }

            pageSettings.update();

            let row = tbl.insertRow();
            row.className = 'wblight';
            let cell = row.insertCell();
            cell.className = 'wmt-sms-wait';
            cell.colSpan = 2;

            let switcher = createElement('input');
            switcher.type = 'checkbox';
            switcher.checked = pageSettings.enabled;
            switcher.addEventListener('change', function () {
                pageSettings.enabled = this.checked;
                pageSettings.store();
                if (this.checked) {
                    checkUpdates();
                }
                else {
                    clearTimeout(reloadTimeout)
                }
            })

            let from = createElement('input');
            from.type = 'text';
            if (pageSettings.from) {
                from.value = pageSettings.from;
            }
            from.addEventListener('change', function () {
                pageSettings.from = this.value;
                pageSettings.store();
            })

            addStyle('.wmt-sms-wait label { display: block; } .wmt-sms-wait label input { vertical-align: middle; } .wmt-sms-wait input[type="text"] { margin-left: 0.5rem; width: 5rem; }');

            let lbl = createElement('label');
            lbl.appendChild(switcher);
            lbl.appendChild(createTextNode('ждать новые письма'));
            cell.appendChild(lbl);

            cell.appendChild(createTextNode('Только от'));
            cell.appendChild(from);

            if (pageSettings.enabled) {
                checkUpdates();
            }
        }
    }
}

wmt_ph.setupTransfer = function () {    
    if (location.hash) {        
        let inputs = ['nick', 'desc', 'gold']
        var hashParam = decodeURIComponent(location.hash).substring(1).split('|');
        for (var ii = 0; ii < hashParam.length; ii++) {
            if (!hashParam[ii]) continue;
            if (inputs.length > ii) {
                let inp = document.querySelector('input[name="' + inputs[ii] + '"]');
                if (inp) {
                    inp.value = hashParam[ii];                    
                }
                else {
                    log('Can not find input with the name "' + inputs[ii] + '"');
                }
            }
            else {
                log('Unsupported hash param #' + ii);
            }            
        }
    }

    let eltr = document.querySelector('form[name="f"] a[href*="el_transfer.php"]');
    let nick = document.querySelector('form[name="f"] input[name="nick"]');
    if (eltr && nick) {
        eltr.updateHref = () => { eltr.href = '\el_transfer.php#' + nick.value; }
        eltr.updateHref();
        nick.addEventListener('keyup', () => eltr.updateHref());
        nick.addEventListener('change', () => eltr.updateHref())
    }
}

wmt_ph.setupElTransfer = function () {
    let sendType = document.querySelector('input[name="sendtype"][value="1"]');
    if (sendType) {
        sendType.setAttribute('checked', "true");        
    }

    if (location.hash) {
        let inputs = ['nick', 'comment', 'gold']
        var hashParam = decodeURIComponent(location.hash).substring(1).split('|');
        for (let ii = 0; ii < hashParam.length; ii++) {
            if (!hashParam[ii]) continue;
            if (inputs.length > ii) {
                let inp = document.querySelector('input[name="' + inputs[ii] + '"]');
                if (inp) {
                    inp.value = hashParam[ii];
                }
                else {
                    log('Can not find input with the name "' + inputs[ii] + '"');
                }
            }
            else {
                log('Unsupported hash param #' + ii);
            }
        }
    }
}

wmt_ph.setupModWorkbench = function () {
    let tbl = document.querySelectorAll('table.wbwhite[width="70%"]');
    for (let ii = 0; ii < tbl.length; ii++) {
        if (tbl[ii].rows.length == 3) {
            if (/Завершение\sработы:/.test(tbl[ii].rows[2].textContent)) {
                let mod = tbl[ii].querySelector('font[color="gray"]');
                let owner = tbl[ii].querySelector('a.pi[href*="pl_info.php?id="]');
                if (mod && owner) {
                    let endDate = tbl[ii].rows[2].textContent.substring(tbl[ii].rows[2].textContent.indexOf(':')).trim();

                    let modText = encodeURIComponent(mod.textContent.trim());                    
                    let modImg = tbl[ii].querySelector('img[src*="i/mods/"][title*="' + decodeURIComponent(modText) + '"]');
                    if (modImg) {
                        let m = /(\S\d+)\.gif/.exec(modImg.src);
                        if (m) {
                            modText = "Завершение установки модификатора " + m[1] + endDate;
                        }
                        else {
                            log('unexpected image');
                        }
                    }
                    else {
                        log('no mod img');
                    }

                    let msg = createElement('a');
                    msg.href = '/sms-create.php?mailto=' + encodeURIComponent(owner.textContent)
                        + "#" + modText;
                    msg.innerHTML = '\u2709';
                    msg.style = 'text-decoration: none; font-size: large; margin-left: 1rem;';
                    msg.title = 'Написать письмо-уведомление владельцу';
                    tbl[ii].rows[2].firstChild.appendChild(msg);
                }
                else {
                    log('There is no owner');
                }
            }
            else {
                //do something with new mod table
            }
        }
        else {
            log('Unsupported table');
        }
    }
    
}

wmt_ph.process = function () {
    wmt_ph.all.forEach(function (ph) { ph.process(document); });
}
wmt_ph.setup = function () {
    wmt_ph.all.forEach(function (ph) { ph.setup(); });
}
wmt_ph.all = [
    new wmt_ph(/home\.php/, wmt_ph.setupHome, wmt_ph.processHome),
    new wmt_ph(/map\.php/, wmt_ph.setupMap, wmt_ph.processMap),
    new wmt_ph(/object-info\.php/, wmt_ph.setupObjectInfo, wmt_ph.processObjectInfo),//
    new wmt_ph(/object_do\.php/, wmt_ph.setupObjectDo, wmt_ph.processObjectDo),//
    new wmt_ph(/pl_info\.php/, wmt_ph.setupPlayerInfo, wmt_ph.processPlayerInfo),//
    new wmt_ph(/mercenary_guild\.php/, wmt_ph.setupMercenaryGuild, wmt_ph.processMercenaryGuild),//
    new wmt_ph(/forum_messages\.php\?tid=\d+/, wmt_ph.setupForumMessages),//
    new wmt_ph(/pl_warlog\.php\?id=\d+/, wmt_ph.setupWarlog, wmt_ph.processWarlog),//
    new wmt_ph(/art_info\.php/, wmt_ph.setupArtInfo, wmt_ph.processArtInfo),//
    new wmt_ph(/battlechat\.php/, wmt_ph.setupBattleChat),//
    new wmt_ph(/pl_hunter_stat\.php/, wmt_ph.setupPlayerHunterStat),//
    new wmt_ph(/army_info\.php\?name=/, wmt_ph.setupArmyInfo),//
    new wmt_ph(/auction\.php/, wmt_ph.setupAuction, wmt_ph.processAuction),//
    new wmt_ph(/auction_new_lot\.php/, wmt_ph.setupAuctionNewLot),
    new wmt_ph(/tavern\.php/, wmt_ph.setupTavern),//
    new wmt_ph(/battle\.php/, wmt_ph.setupBattleResult),//
    new wmt_ph(/ecostat_details\.php\?r=/, wmt_ph.setupEcostatDetails, wmt_ph.processEcostatDetails),//
    new wmt_ph(/pers_settings\.php/, wmt_ph.setupPersSettings),//
    new wmt_ph(/cgame\.php\?gameid=/, wmt_ph.setupCgame),//
    new wmt_ph(/inventory\.php/, wmt_ph.setupInventory, wmt_ph.processInventory),
    new wmt_ph(/transfer\.php/, undefined, wmt_ph.processTransfer),
    new wmt_ph(/skillwheel_demo\.php/, wmt_ph.setupSkillWheelDemo),
    new wmt_ph(/castle\.php/, wmt_ph.setupCastle),
    new wmt_ph(/task_guild\.php/, wmt_ph.setupTask),
	new wmt_ph(/showperkinfo\.php/, undefined, wmt_ph.processShowPerkInfo),
	new wmt_ph(/shop\.php/, wmt_ph.setupShop),
	new wmt_ph(/war\.php/, wmt_ph.setupWar),
	new wmt_ph(/plstats_merc\.php/, wmt_ph.setupPlstatsMerc),
    new wmt_ph(/search\.php/, wmt_ph.setupSearch),
    new wmt_ph(/sms-create\.php/, wmt_ph.setupSmsCreate),
    new wmt_ph(/sms\.php/, wmt_ph.setupSms),
    new wmt_ph(/transfer\.php/, wmt_ph.setupTransfer),
    new wmt_ph(/el_transfer\.php/, wmt_ph.setupElTransfer),
    new wmt_ph(/mod_workbench\.php/, wmt_ph.setupModWorkbench)
];


//execution part
log(location.pathname);
Settings.update();

//Замена стартовой страницы    
if (location.pathname == '/' || location.pathname == '/index.php') {
    if (Settings.useSimpleStartPage) {
        setupSiteMainPage();
    }
}
/*Фрейм чата*/
else if (location.pathname == '/frames.php') {
	setupChat();
}
else {    
    wmt_page.update();
    OwnInfo.update();
    wmt_ph.process();
    initializeCommonStyles();
    if (Settings.useCustomMenu) { insertCustomMainMenu(); }
    wmt_ph.setup();
}
