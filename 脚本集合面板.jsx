// ScriptPanel.jsx
// 创建一个可持久化的脚本管理面板

(function(thisObj) {
    // 添加Array.isArray的polyfill
    if (!Array.isArray) {
        Array.isArray = function(arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }
    
    // 自定义函数检查是否为数组
    function isValidArray(obj) {
        try {
            return obj != null && 
                   typeof obj === 'object' && 
                   (Array.isArray(obj) || obj.constructor === Array || obj instanceof Array);
        } catch(e) {
            return false;
        }
    }

    // 获取用户Documents文件夹路径
    var userDataFolder = Folder.myDocuments.fsName + "/Adobe/After Effects 2025";
    // 确保目录存在
    var folder = new Folder(userDataFolder);
    if (!folder.exists) {
        folder.create();
    }
    // 配置文件路径
    var CONFIG_FILE = userDataFolder + "/scriptsbox_config.json";
    
    // 创建主面板，支持作为独立窗口或嵌入面板
    var mainPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "脚本管理面板", undefined, {resizeable: true, maximizeButton: true, minimizeButton: true});
    mainPanel.orientation = "column";
    mainPanel.alignChildren = "fill";
    mainPanel.spacing = 10;
    mainPanel.margins = 16;

    // 添加窗口大小变化事件处理
    mainPanel.onResizing = mainPanel.onResize = function() {
        this.layout.resize();
    };

    // 创建脚本列表组
    var scriptListGroup = mainPanel.add("group");
    scriptListGroup.orientation = "column";
    scriptListGroup.alignChildren = ["fill", "top"];
    scriptListGroup.spacing = 5;
    scriptListGroup.alignment = ["fill", "fill"];
    scriptListGroup.minimumSize = [200, 200];

    // 创建底部按钮组
    var bottomGroup = mainPanel.add("group");
    bottomGroup.orientation = "row";
    bottomGroup.alignment = ["fill", "bottom"];
    bottomGroup.alignChildren = ["left", "center"];
    bottomGroup.spacing = 10;
    bottomGroup.margins = [0, 5, 0, 0];

    var editButton = bottomGroup.add("button", undefined, "···");
    editButton.helpTip = "编辑";
    editButton.preferredSize = [20, 20];

    var addButton = bottomGroup.add("button", undefined, "+");
    addButton.helpTip = "新增";
    addButton.preferredSize = [20, 20];

    // 控制删除按钮显示状态的变量
    var isEditMode = false;

    // 编辑按钮点击事件
    editButton.onClick = function() {
        isEditMode = !isEditMode;
        editButton.text = isEditMode ? "✓" : "···";
        updateScriptList();
    };

    // 添加脚本按钮点击事件
    addButton.onClick = function() {
        // 创建添加脚本窗口
        var addWindow = new Window("dialog", "添加脚本");
        addWindow.orientation = "column";
        addWindow.alignChildren = ["fill", "top"];
        addWindow.spacing = 10;
        addWindow.margins = 16;

        var nameGroup = addWindow.add("group");
        nameGroup.orientation = "row";
        nameGroup.alignChildren = ["left", "center"];
        nameGroup.add("statictext", undefined, "脚本名称:");
        var scriptNameInput = nameGroup.add("edittext", undefined, "");
        scriptNameInput.preferredSize.width = 200;

        var pathGroup = addWindow.add("group");
        pathGroup.orientation = "row";
        pathGroup.alignChildren = ["left", "center"];
        pathGroup.add("statictext", undefined, "脚本路径:");
        var scriptPathInput = pathGroup.add("edittext", undefined, "");
        scriptPathInput.preferredSize.width = 200;
        var browseButton = pathGroup.add("button", undefined, "浏览");

        var descGroup = addWindow.add("group");
        descGroup.orientation = "row";
        descGroup.alignChildren = ["left", "top"];
        descGroup.add("statictext", undefined, "脚本描述:");
        var scriptDescInput = descGroup.add("edittext", [0, 0, 200, 60], "", {multiline: true});

        var buttonGroup = addWindow.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignChildren = ["center", "center"];
        var confirmButton = buttonGroup.add("button", undefined, "确定");
        var cancelButton = buttonGroup.add("button", undefined, "取消");

        // 浏览文件
        browseButton.onClick = function() {
            var file = File.openDialog("选择脚本文件", "JavaScript:*.jsx;*.js;*.jsxbin;*.aex");
            if (file) {
                scriptPathInput.text = file.fsName;
            }
        };

        // 确认添加
        confirmButton.onClick = function() {
            if (!scriptNameInput.text || !scriptPathInput.text) {
                alert("请输入脚本名称和路径");
                return;
            }

            var scripts = loadConfig();
            scripts.push({
                name: scriptNameInput.text,
                path: scriptPathInput.text,
                description: scriptDescInput.text || ""
            });

            saveConfig(scripts);
            updateScriptList();
            addWindow.close();
        };

        // 取消添加
        cancelButton.onClick = function() {
            addWindow.close();
        };

        addWindow.show();
    };

    // 修改 loadConfig 函数
    function loadConfig() {
        try {
            var configFile = File(CONFIG_FILE);
            var configFolder = configFile.parent;
            
            // 确保配置文件所在目录存在
            if (!configFolder.exists) {
                configFolder.create();
            }
            
            if (configFile.exists) {
                configFile.encoding = "UTF-8";  // 设置编码
                configFile.open('r');
                var jsonStr = configFile.read();
                configFile.close();
                
                if (!jsonStr || jsonStr === "") {
                    return [];
                }
                
                // 手动移除BOM和空白字符
                if (jsonStr.charCodeAt(0) === 0xFEFF) {
                    jsonStr = jsonStr.substring(1);
                }
                // 移除开头和结尾的空白字符
                while (jsonStr.charAt(0) === ' ' || jsonStr.charAt(0) === '\t' || jsonStr.charAt(0) === '\n' || jsonStr.charAt(0) === '\r') {
                    jsonStr = jsonStr.substring(1);
                }
                while (jsonStr.charAt(jsonStr.length - 1) === ' ' || jsonStr.charAt(jsonStr.length - 1) === '\t' || jsonStr.charAt(jsonStr.length - 1) === '\n' || jsonStr.charAt(jsonStr.length - 1) === '\r') {
                    jsonStr = jsonStr.substring(0, jsonStr.length - 1);
                }
                
                try {
                    var config = eval("(" + jsonStr + ")");
                    return isValidArray(config) ? config : [];
                } catch(e) {
                    alert("配置文件解析失败，将重置配置文件\n错误信息: " + e.toString());
                    return [];
                }
            }
            return [];
        } catch(e) {
            alert("读取配置文件时出错: " + e.toString());
            return [];
        }
    }

    // 修改 saveConfig 函数
    function saveConfig(config) {
        try {
            var configFile = File(CONFIG_FILE);
            var configFolder = configFile.parent;
            
            if (!configFolder.exists) {
                configFolder.create();
            }
            
            // 确保 config 是数组
            config = isValidArray(config) ? config : [];
            
            configFile.encoding = "UTF-8";  // 设置编码
            configFile.open('w');
            // 格式化 JSON 字符串以便于阅读
            var jsonStr = JSON.stringify(config, null, 2);
            configFile.write(jsonStr);
            configFile.close();
        } catch(e) {
            alert("保存配置文件时出错: " + e.toString());
        }
    }

    // 更新脚本列表UI
    function updateScriptList() {
        // 清除现有列表
        while (scriptListGroup.children.length > 0) {
            scriptListGroup.remove(scriptListGroup.children[0]);
        }

        // 读取配置并创建脚本按钮
        var scripts = loadConfig();
        for (var i = 0; i < scripts.length; i++) {
            var script = scripts[i];
            var scriptGroup = scriptListGroup.add("group");
            scriptGroup.orientation = "row";
            scriptGroup.alignChildren = ["left", "center"];
            scriptGroup.alignment = ["fill", "top"];
            scriptGroup.spacing = 10;
            scriptGroup.margins = [0, 2, 0, 2];

            // 修改脚本按钮属性
            var scriptButton = scriptGroup.add("button");
            scriptButton.text = script.name;
            scriptButton.preferredSize = [200, 30];   
            scriptButton.alignment = ["fill", "center"];
            scriptButton.justify = "left";
            scriptButton.helpTip = script.description || "";

            // 创建编辑按钮
            var editScriptButton = scriptGroup.add("button", undefined, "✎");
            editScriptButton.helpTip = "编辑";
            editScriptButton.preferredSize = [30, 30];
            editScriptButton.alignment = ["right", "center"];
            editScriptButton.visible = isEditMode;

            // 创建删除按钮
            var deleteButton = scriptGroup.add("button", undefined, "✕");
            deleteButton.helpTip = "删除";
            deleteButton.preferredSize = [30, 30];
            deleteButton.alignment = ["right", "center"];
            deleteButton.visible = isEditMode;

            // 添加编辑按钮事件
            editScriptButton.onClick = function(script) {
                return function() {
                    // 创建编辑窗口
                    var editWindow = new Window("dialog", "编辑脚本");
                    editWindow.orientation = "column";
                    editWindow.alignChildren = ["fill", "top"];
                    editWindow.spacing = 10;
                    editWindow.margins = 16;

                    var nameGroup = editWindow.add("group");
                    nameGroup.orientation = "row";
                    nameGroup.alignChildren = ["left", "center"];
                    nameGroup.add("statictext", undefined, "脚本名称:");
                    var scriptNameInput = nameGroup.add("edittext", undefined, script.name);
                    scriptNameInput.preferredSize.width = 200;

                    var pathGroup = editWindow.add("group");
                    pathGroup.orientation = "row";
                    pathGroup.alignChildren = ["left", "center"];
                    pathGroup.add("statictext", undefined, "脚本路径:");
                    var scriptPathInput = pathGroup.add("edittext", undefined, script.path);
                    scriptPathInput.preferredSize.width = 200;
                    var browseButton = pathGroup.add("button", undefined, "浏览");

                    var descGroup = editWindow.add("group");
                    descGroup.orientation = "row";
                    descGroup.alignChildren = ["left", "top"];
                    descGroup.add("statictext", undefined, "脚本描述:");
                    var scriptDescInput = descGroup.add("edittext", [0, 0, 200, 60], script.description || "", {multiline: true});

                    var buttonGroup = editWindow.add("group");
                    buttonGroup.orientation = "row";
                    buttonGroup.alignChildren = ["center", "center"];
                    var confirmButton = buttonGroup.add("button", undefined, "确定");
                    var cancelButton = buttonGroup.add("button", undefined, "取消");

                    // 浏览文件
                    browseButton.onClick = function() {
                        var file = File.openDialog("选择脚本文件", "JavaScript:*.jsx;*.js");
                        if (file) {
                            scriptPathInput.text = file.fsName;
                        }
                    };

                    // 确认编辑
                    confirmButton.onClick = function() {
                        if (!scriptNameInput.text || !scriptPathInput.text) {
                            alert("请输入脚本名称和路径");
                            return;
                        }

                        var scripts = loadConfig();
                        for (var i = 0; i < scripts.length; i++) {
                            if (scripts[i].path === script.path && scripts[i].name === script.name) {
                                scripts[i] = {
                                    name: scriptNameInput.text,
                                    path: scriptPathInput.text,
                                    description: scriptDescInput.text || ""
                                };
                                break;
                            }
                        }

                        saveConfig(scripts);
                        updateScriptList();
                        editWindow.close();
                    };

                    cancelButton.onClick = function() {
                        editWindow.close();
                    };

                    editWindow.show();
                };
            }(script);

            // 运行脚本
            scriptButton.onClick = function(script) {
                return function() {
                    if (!isEditMode) {  // 只在非编辑模式下执行脚本
                        try {
                            var scriptFile = File(script.path);
                            if (!scriptFile.exists) {
                                alert("找不到脚本文件: " + script.path);
                                return;
                            }
                            
                            scriptFile.open('r');
                            if (!scriptFile.length) {
                                alert("脚本文件为空: " + script.path);
                                scriptFile.close();
                                return;
                            }
                            scriptFile.close();
                            
                            $.evalFile(scriptFile);
                        } catch(e) {
                            alert("执行脚本时出错:\n" + e.toString());
                        }
                    }
                };
            }(script);

            // 删除脚本（保留这个删除脚本的事件处理）
            deleteButton.onClick = function(script) {
                return function() {
                    var scripts = loadConfig();
                    scripts = scripts.filter(function(s) {
                        return !(s.path === script.path && s.name === script.name);
                    });
                    saveConfig(scripts);
                    updateScriptList();
                };
            }(script);
        }

        mainPanel.layout.layout(true);
    }

    // 初始化脚本列表
    updateScriptList();

    // 如果是独立窗口模式，显示面板
    if (!(thisObj instanceof Panel)) {
        mainPanel.show();
    }
})(this);
