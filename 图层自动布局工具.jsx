(function(thisObj) {
    // 创建面板或窗口
    var panel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "图层自动布局工具", undefined, { resizeable: true });
    panel.orientation = "column";
    panel.alignChildren = "fill";
    
    // 创建主内容组
    var mainContent = panel.add("group");
    mainContent.orientation = "column";
    mainContent.alignChildren = "fill";

    // 添加提示文本组（初始隐藏）
    var messageGroup = panel.add("group");
    messageGroup.orientation = "column";
    messageGroup.alignChildren = "center";
    var messageText = messageGroup.add("statictext", undefined, "");
    messageGroup.visible = false;

    // 添加刷新按钮（放在底部）
    var refreshButton = panel.add("button", undefined, "刷新");

    // 刷新功能函数
    function refreshPanel() {
        // 清除现有内容
        while(mainContent.children.length > 0) {
            mainContent.remove(mainContent.children[0]);
        }

        // 检查合成和选中图层
        var hasComp = app.project.activeItem && app.project.activeItem instanceof CompItem;
        var hasSelectedLayer = hasComp && app.project.activeItem.selectedLayers.length > 0;

        // 显示相应的提示信息
        if (!hasComp) {
            messageText.text = "请先打开一个合成！";
            messageGroup.visible = true;
            mainContent.visible = false;
        } else if (!hasSelectedLayer) {
            messageText.text = "请选择一个图层！";
            messageGroup.visible = true;
            mainContent.visible = false;
        } else {
            messageGroup.visible = false;
            mainContent.visible = true;
        }

        // 根据条件显示或隐藏刷新按钮
        refreshButton.visible = !(hasComp && hasSelectedLayer);

        // 如果条件都满足，创建主界面
        if (hasComp && hasSelectedLayer) {
            var comp = app.project.activeItem;
            var selectedLayer = comp.selectedLayers[0]; // 移到这里，提升作用域
            
            // 创建目标图层下拉列表
            var targetGroup = mainContent.add("group");
            targetGroup.orientation = "column";
            var targetLabel = targetGroup.add("statictext", undefined, "选择目标图层：");
            targetLabel.alignment = "left";

            // 创建水平布局组
            var dropdownGroup = targetGroup.add("group");
            dropdownGroup.orientation = "row";
            dropdownGroup.spacing = 5;
            var layerDropdown = dropdownGroup.add("dropdownlist", [0, 0, 200, 25]);
            var refreshLayerList = dropdownGroup.add("button", undefined, "↻");
            refreshLayerList.preferredSize = [26, 26]; // 设置按钮宽度为30，高度为30

            // 封装填充下拉列表的函数
            function populateLayerDropdown() {
                // 获取最新的选中图层
                var currentSelectedLayer = comp.selectedLayers[0];
                if (!currentSelectedLayer) {
                    alert("请先选择一个图层！");
                    refreshPanel();
                    return;
                }
                selectedLayer = currentSelectedLayer; // 更新selectedLayer变量

                layerDropdown.removeAll(); // 清空现有项目
                
                for (var i = 1; i <= comp.numLayers; i++) {
                    var layer = comp.layer(i);
                    if (layer.index !== selectedLayer.index) {
                        layerDropdown.add("item", layer.name + " [" + i + "]");
                    }
                }
                if (layerDropdown.items.length > 0) {
                    layerDropdown.selection = 0;
                    layerDropdown.enabled = true;
                } else {
                    layerDropdown.add("item", "没有其他可选图层");
                    layerDropdown.selection = 0;
                    layerDropdown.enabled = false;
                }
            }

            // 初始填充下拉列表
            populateLayerDropdown();

            // 绑定刷新按钮事件
            refreshLayerList.onClick = function() {
                populateLayerDropdown();
            };

            // 创建对齐方式选择九宫格
            var alignGroup = mainContent.add("panel", undefined, "对齐方式");
            alignGroup.orientation = "column";
            alignGroup.alignChildren = "center";

            var row1 = alignGroup.add("group");
            row1.orientation = "row";
            var topLeftAlign = row1.add("radiobutton", undefined, "");
            var topAlign = row1.add("radiobutton", undefined, "");
            var topRightAlign = row1.add("radiobutton", undefined, "");

            var row2 = alignGroup.add("group");
            row2.orientation = "row";
            var leftAlign = row2.add("radiobutton", undefined, "");
            var centerAlign = row2.add("radiobutton", undefined, "");
            var rightAlign = row2.add("radiobutton", undefined, "");

            var row3 = alignGroup.add("group");
            row3.orientation = "row";
            var bottomLeftAlign = row3.add("radiobutton", undefined, "");
            var bottomAlign = row3.add("radiobutton", undefined, "");
            var bottomRightAlign = row3.add("radiobutton", undefined, "");

            centerAlign.value = true;

            // 确保单选按钮互斥
            var allAlignButtons = [
                topLeftAlign, topAlign, topRightAlign,
                leftAlign, centerAlign, rightAlign,
                bottomLeftAlign, bottomAlign, bottomRightAlign
            ];
            allAlignButtons.forEach(function(button) {
                button.onClick = function() {
                    allAlignButtons.forEach(function(otherButton) {
                        if (otherButton !== button) {
                            otherButton.value = false;
                        }
                    });
                };
            });

            // 创建按钮组
            var buttonGroup = mainContent.add("group");
            buttonGroup.alignment = "center";
            var applyButton = buttonGroup.add("button", undefined, "应用");
            var clearButton = buttonGroup.add("button", undefined, "清除");

            // 检测循环依赖的函数
            function hasCircularDependency(startLayer, targetLayer) {
                var effects = targetLayer.property("Effects");
                var targetControl = effects ? effects.property("对齐图层") : null;

                if (targetControl) {
                    var nextLayerIndex = targetControl.property("Layer").value;
                    if (nextLayerIndex === startLayer.index) {
                        return true; // 检测到循环依赖
                    }

                    var nextLayer = comp.layer(nextLayerIndex);
                    if (nextLayer) {
                        return hasCircularDependency(startLayer, nextLayer); // 递归检测
                    }
                }

                return false; // 未检测到循环依赖
            }

            // 应用按钮点击事件
            applyButton.onClick = function() {
                // 检查下拉列表状态
                if (!layerDropdown.enabled || layerDropdown.selection === null) {
                    alert("请先选择一个有效的目标图层！");
                    return;
                }

                // 获取当前选中的图层
                var followerLayer = comp.selectedLayers[0];
                if (!followerLayer) {
                    alert("请先选择一个图层！");
                    return;
                }

                var selectedIndex = layerDropdown.selection.text.match(/\[(\d+)\]$/)[1];
                var targetLayer = comp.layer(parseInt(selectedIndex));

                // 检测是否存在循环依赖
                if (hasCircularDependency(followerLayer, targetLayer)) {
                    alert("错误：检测到循环依赖，无法设置目标图层！");
                    return;
                }

                var effects = followerLayer.property("Effects");
                var targetControl = effects.property("对齐图层") || effects.addProperty("Layer Control");
                targetControl.name = "对齐图层";
                targetControl.property("Layer").setValue(targetLayer.index);

                var offsetControl = effects.property("位置偏移") || effects.addProperty("Point Control");
                offsetControl.name = "位置偏移";
                offsetControl.property("Point").setValue([0, 0]);

                var expression = 'var targetLayer = effect("对齐图层")("Layer");\n' +
                                 'var offset = effect("位置偏移")("Point");\n\n' +
                                 'if (targetLayer) {\n' +
                                 '    var targetRect = targetLayer.sourceRectAtTime(time, false);\n' +
                                 '    var targetPos = [0, 0];\n\n';

                if (topLeftAlign.value) {
                    expression += '    targetPos = [targetRect.left, targetRect.top];\n';
                } else if (topAlign.value) {
                    expression += '    targetPos = [targetRect.left + targetRect.width / 2, targetRect.top];\n';
                } else if (topRightAlign.value) {
                    expression += '    targetPos = [targetRect.left + targetRect.width, targetRect.top];\n';
                } else if (leftAlign.value) {
                    expression += '    targetPos = [targetRect.left, targetRect.top + targetRect.height / 2];\n';
                } else if (centerAlign.value) {
                    expression += '    targetPos = [targetRect.left + targetRect.width / 2, targetRect.top + targetRect.height / 2];\n';
                } else if (rightAlign.value) {
                    expression += '    targetPos = [targetRect.left + targetRect.width, targetRect.top + targetRect.height / 2];\n';
                } else if (bottomLeftAlign.value) {
                    expression += '    targetPos = [targetRect.left, targetRect.top + targetRect.height];\n';
                } else if (bottomAlign.value) {
                    expression += '    targetPos = [targetRect.left + targetRect.width / 2, targetRect.top + targetRect.height];\n';
                } else if (bottomRightAlign.value) {
                    expression += '    targetPos = [targetRect.left + targetRect.width, targetRect.top + targetRect.height];\n';
                }

                expression += '    var worldPos = targetLayer.toWorld(targetPos);\n' +
                              '    [worldPos[0] + offset[0], worldPos[1] + offset[1]];\n' +
                              '} else {\n' +
                              '    value;\n' +
                              '}';

                followerLayer.transform.position.expression = expression;
                alert("对齐设置已完成！");

                // 应用完成后刷新面板
                refreshPanel();
            };

            // 清除按钮点击事件
            clearButton.onClick = function() {
                if (comp.selectedLayers.length === 0) {
                    alert("请先选择一个图层！");
                    return;
                }

                try {
                    app.beginUndoGroup("清除对齐设置");

                    var followerLayer = comp.selectedLayers[0];
                    var cleared = false;

                    // 检查并清除表达式
                    var positionProp = followerLayer.transform.position;
                    if (positionProp.expression) {
                        var expression = positionProp.expression;
                        if (expression.indexOf('effect("对齐图层")("Layer")') !== -1 && 
                            expression.indexOf('effect("位置偏移")("Point")') !== -1) {
                            positionProp.expression = "";
                            cleared = true;
                        }
                    }

                    // 检查并清除效果控制器
                    if (followerLayer.effect("对齐图层")) {
                        followerLayer.effect("对齐图层").remove();
                        cleared = true;
                    }
                    if (followerLayer.effect("位置偏移")) {
                        followerLayer.effect("位置偏移").remove();
                        cleared = true;
                    }

                    if (cleared) {
                        alert("已清除本脚本生成的表达式和控制器！");
                    } else {
                        alert("未检测到本脚本生成的内容，无需清除！");
                    }

                } catch(e) {
                    alert("清除操作出错: " + e.toString());
                } finally {
                    app.endUndoGroup();
                }
            };

        }

        // 重新布局面板
        panel.layout.layout(true);
    }

    // 绑定刷新按钮事件
    refreshButton.onClick = function() {
        refreshPanel();
    }

    // 初始加载
    refreshPanel();

    // 显示面板或窗口
    if (panel instanceof Window) {
        panel.center();
        panel.show();
    } else {
        panel.layout.layout(true);
    }
})(this);
