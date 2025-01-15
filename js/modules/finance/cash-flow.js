// 现金流水组件
Vue.component('cash-flow-component', {
    template: `
        <div class="cash-flow">
            <el-card>
                <div slot="header">
                    <el-row type="flex" justify="space-between" align="middle">
                        <el-col :span="16">
                            <el-form :inline="true" :model="queryForm">
                                <el-form-item label="日期范围">
                                    <el-date-picker
                                        v-model="queryForm.dateRange"
                                        type="daterange"
                                        range-separator="至"
                                        start-placeholder="开始日期"
                                        end-placeholder="结束日期"
                                        @change="handleDateRangeChange">
                                    </el-date-picker>
                                </el-form-item>
                                <el-form-item label="类型">
                                    <el-select v-model="queryForm.type" placeholder="请选择类型" clearable>
                                        <el-option label="收入" value="收入"></el-option>
                                        <el-option label="支出" value="支出"></el-option>
                                    </el-select>
                                </el-form-item>
                                <el-form-item label="业务类型">
                                    <el-select v-model="queryForm.relatedType" placeholder="请选择业务类型" clearable>
                                        <el-option
                                            v-for="type in businessTypes"
                                            :key="type"
                                            :label="type"
                                            :value="type">
                                        </el-option>
                                    </el-select>
                                </el-form-item>
                            </el-form>
                        </el-col>
                        <el-col :span="8" style="text-align: right;">
                            <el-button type="primary" @click="handleAddFlow">新增流水</el-button>
                            <el-button type="success" @click="exportCashFlow">导出流水</el-button>
                        </el-col>
                    </el-row>
                </div>

                <!-- 现金统计卡片 -->
                <el-row :gutter="20" style="margin-bottom: 20px;">
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">现金余额</div>
                            <div class="amount-text">¥{{ systemData.cashFlow.balance.toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">期间收入</div>
                            <div class="amount-text green-text">¥{{ periodIncome.toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">期间支出</div>
                            <div class="amount-text red-text">¥{{ periodExpense.toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">净收支</div>
                            <div class="amount-text" :class="{'red-text': periodNet < 0, 'green-text': periodNet > 0}">
                                ¥{{ periodNet.toFixed(2) }}
                            </div>
                        </el-card>
                    </el-col>
                </el-row>

                <!-- 现金流水列表 -->
                <el-table :data="filteredRecords" stripe border>
                    <el-table-column prop="date" label="日期" width="120"></el-table-column>
                    <el-table-column prop="type" label="类型" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="scope.row.type === '收入' ? 'success' : 'danger'">
                                {{ scope.row.type }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="金额" width="120">
                        <template slot-scope="scope">
                            <span :class="{'red-text': scope.row.type === '支出', 'green-text': scope.row.type === '收入'}">
                                ¥{{ scope.row.amount.toFixed(2) }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="余额" width="120">
                        <template slot-scope="scope">
                            ¥{{ scope.row.balance.toFixed(2) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="relatedType" label="业务类型" width="120"></el-table-column>
                    <el-table-column prop="remark" label="备注"></el-table-column>
                    <el-table-column label="操作" width="120" fixed="right">
                        <template slot-scope="scope">
                            <el-button 
                                size="mini" 
                                type="danger"
                                @click="handleDelete(scope.row)"
                                :disabled="!canDelete(scope.row)">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>

            <!-- 新增现金流水对话框 -->
            <el-dialog 
                title="新增现金流水" 
                :visible.sync="dialogVisible"
                width="30%">
                <el-form :model="flowForm" :rules="rules" ref="flowForm" label-width="100px">
                    <el-form-item label="日期" prop="date">
                        <el-date-picker
                            v-model="flowForm.date"
                            type="date"
                            placeholder="选择日期">
                        </el-date-picker>
                    </el-form-item>
                    <el-form-item label="类型" prop="type">
                        <el-radio-group v-model="flowForm.type">
                            <el-radio label="收入">收入</el-radio>
                            <el-radio label="支出">支出</el-radio>
                        </el-radio-group>
                    </el-form-item>
                    <el-form-item label="金额" prop="amount">
                        <el-input-number 
                            v-model="flowForm.amount"
                            :min="0"
                            :precision="2"
                            :step="100">
                        </el-input-number>
                    </el-form-item>
                    <el-form-item label="业务类型" prop="relatedType">
                        <el-input v-model="flowForm.relatedType" placeholder="如：其他收入、其他支出"></el-input>
                    </el-form-item>
                    <el-form-item label="备注" prop="remark">
                        <el-input type="textarea" v-model="flowForm.remark"></el-input>
                    </el-form-item>
                </el-form>
                <div slot="footer">
                    <el-button @click="dialogVisible = false">取 消</el-button>
                    <el-button type="primary" @click="confirmAdd">确 定</el-button>
                </div>
            </el-dialog>
        </div>
    `,

    props: {
        systemData: {
            type: Object,
            required: true
        }
    },

    data() {
        return {
            queryForm: {
                dateRange: [],
                type: '',
                relatedType: ''
            },
            dialogVisible: false,
            flowForm: {
                date: new Date().toISOString().split('T')[0],
                type: '收入',
                amount: 0,
                relatedType: '',
                remark: ''
            },
            rules: {
                date: [
                    { required: true, message: '请选择日期', trigger: 'change' }
                ],
                type: [
                    { required: true, message: '请选择类型', trigger: 'change' }
                ],
                amount: [
                    { required: true, message: '请输入金额', trigger: 'blur' },
                    { type: 'number', min: 0, message: '金额必须大于0', trigger: 'blur' }
                ],
                relatedType: [
                    { required: true, message: '请输入业务类型', trigger: 'blur' }
                ]
            }
        }
    },

    computed: {
        // 获取所有业务类型
        businessTypes() {
            return [...new Set(this.systemData.cashFlow.records.map(r => r.relatedType))];
        },

        // 根据条件筛选记录
        filteredRecords() {
            return this.systemData.cashFlow.records
                .filter(record => {
                    // 日期范围筛选
                    if (this.queryForm.dateRange && this.queryForm.dateRange.length) {
                        const recordDate = new Date(record.date);
                        if (recordDate < this.queryForm.dateRange[0] || 
                            recordDate > this.queryForm.dateRange[1]) {
                            return false;
                        }
                    }

                    // 类型筛选
                    if (this.queryForm.type && record.type !== this.queryForm.type) {
                        return false;
                    }

                    // 业务类型筛选
                    if (this.queryForm.relatedType && 
                        record.relatedType !== this.queryForm.relatedType) {
                        return false;
                    }

                    return true;
                })
                .map((record, index, array) => {
                    // 计算每条记录的余额
                    const balance = array
                        .slice(0, index + 1)
                        .reduce((sum, r) => {
                            return sum + (r.type === '收入' ? r.amount : -r.amount);
                        }, 0);
                    return { ...record, balance };
                });
        },

        // 期间收入
        periodIncome() {
            return this.filteredRecords
                .filter(r => r.type === '收入')
                .reduce((sum, r) => sum + r.amount, 0);
        },

        // 期间支出
        periodExpense() {
            return this.filteredRecords
                .filter(r => r.type === '支出')
                .reduce((sum, r) => sum + r.amount, 0);
        },

        // 期间净收支
        periodNet() {
            return this.periodIncome - this.periodExpense;
        }
    },

    methods: {
        // 处理日期范围变化
        handleDateRangeChange() {
            // 日期范围变化时可能需要重新计算统计数据
        },

        // 新增流水
        handleAddFlow() {
            this.flowForm = {
                date: new Date().toISOString().split('T')[0],
                type: '收入',
                amount: 0,
                relatedType: '',
                remark: ''
            };
            this.dialogVisible = true;
        },

        // 确认新增
        confirmAdd() {
            this.$refs.flowForm.validate((valid) => {
                if (valid) {
                    // 创建新记录
                    const newRecord = {
                        id: `CF${Date.now()}`,
                        ...this.flowForm
                    };

                    // 更新现金余额
                    if (newRecord.type === '收入') {
                        this.systemData.cashFlow.balance += newRecord.amount;
                    } else {
                        this.systemData.cashFlow.balance -= newRecord.amount;
                    }

                    // 添加记录
                    this.systemData.cashFlow.records.push(newRecord);

                    this.$emit('data-change');
                    this.dialogVisible = false;
                    this.$message.success('添加成功');
                }
            });
        },

        // 检查是否可以删除
        canDelete(record) {
            // 只允许删除手动添加的记录，不允许删除系统自动生成的记录
            return !record.relatedId; // 如果有relatedId说明是系统生成的
        },

        // 删除流水记录
        handleDelete(record) {
            if (!this.canDelete(record)) {
                this.$message.warning('该记录不能删除');
                return;
            }

            this.$confirm('确认删除该条现金流水记录吗？', '提示', {
                type: 'warning'
            }).then(() => {
                // 更新现金余额
                if (record.type === '收入') {
                    this.systemData.cashFlow.balance -= record.amount;
                } else {
                    this.systemData.cashFlow.balance += record.amount;
                }

                // 删除记录
                const index = this.systemData.cashFlow.records.findIndex(r => r.id === record.id);
                if (index !== -1) {
                    this.systemData.cashFlow.records.splice(index, 1);
                }

                this.$emit('data-change');
                this.$message.success('删除成功');
            }).catch(() => {});
        },

        // 导出现金流水
        exportCashFlow() {
            // 生成CSV内容
            let csvContent = '\uFEFF'; // 添加BOM以支持中文
            csvContent += `现金流水记录\n`;
            if (this.queryForm.dateRange && this.queryForm.dateRange.length) {
                csvContent += `统计期间：${this.queryForm.dateRange[0].toLocaleDateString()} 至 ${this.queryForm.dateRange[1].toLocaleDateString()}\n`;
            }
            csvContent += '\n';
            csvContent += `日期,类型,金额,余额,业务类型,备注\n`;

            this.filteredRecords.forEach(record => {
                csvContent += `${record.date},${record.type},${record.amount.toFixed(2)},` +
                    `${record.balance.toFixed(2)},${record.relatedType},"${record.remark || ''}"\n`;
            });

            csvContent += `\n汇总信息\n`;
            csvContent += `期间收入,¥${this.periodIncome.toFixed(2)}\n`;
            csvContent += `期间支出,¥${this.periodExpense.toFixed(2)}\n`;
            csvContent += `净收支,¥${this.periodNet.toFixed(2)}\n`;
            csvContent += `现金余额,¥${this.systemData.cashFlow.balance.toFixed(2)}\n`;

            // 创建并下载文件
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `现金流水_${new Date().toLocaleDateString()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    },

    mounted() {
        // 如果没有任何记录，添加一些测试数据
        if (this.systemData.cashFlow.records.length === 0) {
            const testRecords = [
                {
                    id: 'CF001',
                    date: '2024-01-01',
                    type: '收入',
                    amount: 10000,
                    relatedType: '销售收款',
                    remark: '测试收入'
                },
                {
                    id: 'CF002',
                    date: '2024-01-02',
                    type: '支出',
                    amount: 5000,
                    relatedType: '采购付款',
                    remark: '测试支出'
                }
            ];
            
            this.systemData.cashFlow.records.push(...testRecords);
            this.systemData.cashFlow.balance = 5000;
        }
    }
}); 