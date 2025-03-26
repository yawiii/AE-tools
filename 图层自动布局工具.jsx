{
    // 确保有打开的合成
    if (app.project.activeItem && app.project.activeItem instanceof CompItem) {
        var comp = app.project.activeItem;
        var selectedLayers = comp.selectedLayers;

        if (selectedLayers.length > 0) {
            var followerLayer = selectedLayers[0];
            
            // 创建对话框
            var dialog = new Window("dialog", "图层自动布局工具");
            dialog.orientation = "column";
            dialog.alignChildren = "fill";
            
            // 创建目标图层下拉列表
            var targetGroup = dialog.add("group");
            targetGroup.orientation = "column"; // 将静态文本和下拉列表垂直排列
            var targetLabel = targetGroup.add("statictext", undefined, "选择目标图层：");
            targetLabel.alignment = "left"; // 设置左对齐
            var layerDropdown = targetGroup.add("dropdownlist", [0, 0, 200, 25]); // 设置下拉列表宽度更长

            // 创建对齐方式选择九宫格
            var alignGroup = dialog.add("panel", undefined, "对齐方式");
            alignGroup.orientation = "column";
            alignGroup.alignChildren = "center";

            // 第一行
            var row1 = alignGroup.add("group");
            row1.orientation = "row";
            var topLeftAlign = row1.add("radiobutton", undefined, "");
            var topAlign = row1.add("radiobutton", undefined, "");
            var topRightAlign = row1.add("radiobutton", undefined, "");

            // 第二行
            var row2 = alignGroup.add("group");
            row2.orientation = "row";
            var leftAlign = row2.add("radiobutton", undefined, "");
            var centerAlign = row2.add("radiobutton", undefined, "");
            var rightAlign = row2.add("radiobutton", undefined, "");

            // 第三行
            var row3 = alignGroup.add("group");
            row3.orientation = "row";
            var bottomLeftAlign = row3.add("radiobutton", undefined, "");
            var bottomAlign = row3.add("radiobutton", undefined, "");
            var bottomRightAlign = row3.add("radiobutton", undefined, "");

            // 默认选中居中对齐
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

            // 添加所有图层到下拉列表
            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layer(i);
                if (layer !== followerLayer) { // 排除当前选中的图层
                    layerDropdown.add("item", layer.name + " [" + i + "]");
                }
            }
            
            // 创建按钮组
            var buttonGroup = dialog.add("group");
            buttonGroup.alignment = "center";
            var okButton = buttonGroup.add("button", undefined, "确定");
            var cancelButton = buttonGroup.add("button", undefined, "取消");
            
            // 设置默认选项
            if (layerDropdown.items.length > 0) {
                layerDropdown.selection = 0;
            }
            
            // 按钮点击事件
            okButton.onClick = function() {
                if (layerDropdown.selection !== null) {
                    var selectedIndex = layerDropdown.selection.text.match(/\[(\d+)\]$/)[1];
                    var targetLayer = comp.layer(parseInt(selectedIndex));

                    // 检测是否选中的图层与目标图层相同
                    if (targetLayer === followerLayer) {
                        showCustomDialog("错误：选中的图层不能与目标图层相同！");
                        return; // 中止执行
                    }

                    // 检测是否存在循环依赖
                    if (hasCircularDependency(followerLayer, targetLayer)) {
                        showCustomDialog("错误：检测到循环依赖，无法设置目标图层！");
                        return; // 中止执行
                    }

                    dialog.close(1); // 关闭对话框并返回确认状态
                } else {
                    showCustomDialog("请先选择一个目标图层！");
                }
            };

            cancelButton.onClick = function() {
                dialog.close(2); // 关闭对话框并返回取消状态
            };

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

            // 自定义对话框函数
            function showCustomDialog(message) {
                var customDialog = new Window("dialog", "提示信息");
                customDialog.add("statictext", undefined, message);
                var okButton = customDialog.add("button", undefined, "确定", { name: "ok" });
                customDialog.center(); // 居中显示
                customDialog.show();
            }

            // 显示对话框并根据返回值判断用户操作
            if (dialog.show() == 1) { // 用户点击了“确认”按钮
                if (layerDropdown.selection !== null) {
                    var selectedIndex = layerDropdown.selection.text.match(/\[(\d+)\]$/)[1];
                    var targetLayer = comp.layer(parseInt(selectedIndex));
                    var effects = followerLayer.property("Effects");

                    // 检查是否已存在同名控制器
                    var targetControl = effects.property("对齐图层");
                    if (!targetControl) {
                        targetControl = effects.addProperty("Layer Control");
                        targetControl.name = "对齐图层";
                    }
                    targetControl.property("Layer").setValue(targetLayer.index);

                    var offsetControl = effects.property("位置偏移");
                    if (!offsetControl) {
                        offsetControl = effects.addProperty("Point Control");
                        offsetControl.name = "位置偏移";
                    }
                    offsetControl.property("Point").setValue([0, 0]);

                    // 根据选择的对齐方式创建不同的表达式
                    var expression = 'var targetLayer = effect("对齐图层")("Layer");\n' +
                                   'var offset = effect("位置偏移")("Point");\n\n' +
                                   'if (targetLayer) {\n' +
                                   '    var targetRect = targetLayer.sourceRectAtTime(time, false);\n' +
                                   '    var targetPos = [0, 0];\n\n';

                    if (topLeftAlign.value) {
                        expression += '    targetPos = [\n' +
                                    '        targetRect.left,\n' +
                                    '        targetRect.top\n' +
                                    '    ];\n';
                    } else if (topAlign.value) {
                        expression += '    targetPos = [\n' +
                                    '        targetRect.left + targetRect.width / 2,\n' +
                                    '        targetRect.top\n' +
                                    '    ];\n';
                    } else if (topRightAlign.value) {
                        expression += '    targetPos = [\n' +
                                    '        targetRect.left + targetRect.width,\n' +
                                    '        targetRect.top\n' +
                                    '    ];\n';
                    } else if (leftAlign.value) {
                        expression += '    targetPos = [\n' +
                                    '        targetRect.left,\n' +
                                    '        targetRect.top + targetRect.height / 2\n' +
                                    '    ];\n';
                    } else if (centerAlign.value) {
                        expression += '    targetPos = [\n' +
                                    '        targetRect.left + targetRect.width / 2,\n' +
                                    '        targetRect.top + targetRect.height / 2\n' +
                                    '    ];\n';
                    } else if (rightAlign.value) {
                        expression += '    targetPos = [\n' +
                                    '        targetRect.left + targetRect.width,\n' +
                                    '        targetRect.top + targetRect.height / 2\n' +
                                    '    ];\n';
                    } else if (bottomLeftAlign.value) {
                        expression += '    targetPos = [\n' +
                                    '        targetRect.left,\n' +
                                    '        targetRect.top + targetRect.height\n' +
                                    '    ];\n';
                    } else if (bottomAlign.value) {
                        expression += '    targetPos = [\n' +
                                    '        targetRect.left + targetRect.width / 2,\n' +
                                    '        targetRect.top + targetRect.height\n' +
                                    '    ];\n';
                    } else if (bottomRightAlign.value) {
                        expression += '    targetPos = [\n' +
                                    '        targetRect.left + targetRect.width,\n' +
                                    '        targetRect.top + targetRect.height\n' +
                                    '    ];\n';
                    }

                    expression += '    var worldPos = targetLayer.toWorld(targetPos);\n' +
                                 '    [worldPos[0] + offset[0], worldPos[1] + offset[1]]\n' +
                                 '} else {\n' +
                                 '    value\n' +
                                 '}';

                    // 应用表达式到位置属性
                    followerLayer.transform.position.expression = expression;

                } else {
                    showCustomDialog("操作失败，请检查是否正确选择了目标图层和对齐方式！");
                }
            }
        } else {
            showCustomDialog("请先选择一个跟随图层！");
        }
    } else {
        showCustomDialog("请先打开一个合成！");
    }
}