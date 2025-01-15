// 应付管理组件
Vue.component('payables-component', {
    template: `
        <div class="payables">
            <el-card>
                <div slot="header">
                    <el-row type="flex" justify="space-between" align="middle">
                        <el-col :span="16">
                            <el-form :inline="true" :model="queryForm">
                                <el-form-item label="供应商">
                                    <el-select 
                                        v-model="queryForm.supplierId" 
                                        placeholder="请选择供应商"
                                        filterable
                                        clearable>
                                        <el-option
                                            v-for="supplier in systemData.suppliers"
                                            :key="supplier.id"
                                            :label="supplier.name"
                                            :value="supplier.id">
                                        </el-option>
                                    </el-select>
                                </el-form-item>
                                <el-form-item label="状态">
                                    <el-select 
                                        v-model="queryForm.status" 
                                        placeholder="请选择状态"
                                        clearable>
                                        <el-option label="未付款" value="pending"></el-option>
                                        <el-option label="部分付款" value="partial"></el-option>
                                        <el-option label="已付款" value="completed"></el-option>
                                        <el-option label="已逾期" value="overdue"></el-option>
                                    </el-select>
                                </el-form-item>
                            </el-form>
                        </el-col>
                        <el-col :span="8" style="text-align: right;">
                            <el-button type="primary" @click="handlePay">付款登记</el-button>
                            <el-button type="success" @click="exportPayables">导出明细</el-button>
                        </el-col>
                    </el-row>
                </div>

                <!-- 应付统计卡片 -->
                <el-row :gutter="20" style="margin-bottom: 20px;">
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">应付总额</div>
                            <div class="amount-text">¥{{ (totalAmount || 0).toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">已付金额</div>
                            <div class="amount-text green-text">¥{{ (paidAmount || 0).toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">未付金额</div>
                            <div class="amount-text red-text">¥{{ (unpaidAmount || 0).toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">逾期金额</div>
                            <div class="amount-text warning-text">¥{{ (overdueAmount || 0).toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                </el-row>

                <!-- 应付列表 -->
                <el-table :data="filteredPayables" stripe border>
                    <el-table-column prop="date" label="单据日期" width="120"></el-table-column>
                    <el-table-column prop="documentNo" label="单据编号" width="160"></el-table-column>
                    <el-table-column prop="supplierName" label="供应商名称"></el-table-column>
                    <el-table-column label="单据金额" width="120">
                        <template slot-scope="scope">
                            ¥{{ (scope.row.amount || 0).toFixed(2) }}
                        </template>
                    </el-table-column>
                    <el-table-column label="已付金额" width="120">
                        <template slot-scope="scope">
                            <span class="green-text">¥{{ (scope.row.paidAmount || 0).toFixed(2) }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="未付金额" width="120">
                        <template slot-scope="scope">
                            <span class="red-text">¥{{ (getUnpaidAmount(scope.row) || 0).toFixed(2) }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="dueDate" label="到期日" width="120"></el-table-column>
                    <el-table-column label="状态" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="getStatusType(scope.row)">
                                {{ getStatusText(scope.row) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="200" fixed="right">
                        <template slot-scope="scope">
                            <el-button 
                                size="mini" 
                                type="primary"
                                :disabled="isCompleted(scope.row)"
                                @click="handlePay(scope.row)">付款</el-button>
                            <el-button 
                                size="mini" 
                                @click="viewHistory(scope.row)">记录</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>

            <!-- 付款对话框 -->
            <el-dialog 
                :title="showAddPayForm ? '新增应付' : '付款登记'"
                :visible.sync="payDialogVisible"
                width="30%">
                <el-form :model="payForm" :rules="rules" ref="payForm" label-width="100px">
                    <!-- 新增付款表单 -->
                    <template v-if="showAddPayForm">
                        <el-form-item label="供应商" prop="supplierId">
                            <el-select 
                                v-model="payForm.supplierId" 
                                filterable 
                                placeholder="请选择供应商"
                                style="width: 100%;">
                                <el-option
                                    v-for="supplier in systemData.suppliers"
                                    :key="supplier.id"
                                    :label="supplier.name"
                                    :value="supplier.id">
                                </el-option>
                            </el-select>
                        </el-form-item>
                        <el-form-item label="应付金额" prop="amount">
                            <el-input-number 
                                v-model="payForm.amount"
                                :min="0"
                                :precision="2"
                                style="width: 100%;">
                            </el-input-number>
                        </el-form-item>
                        <el-form-item label="到期日" prop="dueDate">
                            <el-date-picker
                                v-model="payForm.dueDate"
                                type="date"
                                placeholder="选择到期日"
                                style="width: 100%;">
                            </el-date-picker>
                        </el-form-item>
                    </template>
                    <!-- 付款表单 -->
                    <template v-else>
                        <el-form-item label="单据编号">
                            <span>{{ payForm.documentNo }}</span>
                        </el-form-item>
                        <el-form-item label="供应商名称">
                            <span>{{ payForm.supplierName }}</span>
                        </el-form-item>
                        <el-form-item label="应付金额">
                            <span>¥{{ (payForm.amount || 0).toFixed(2) }}</span>
                        </el-form-item>
                        <el-form-item label="已付金额">
                            <span>¥{{ (payForm.paidAmount || 0).toFixed(2) }}</span>
                        </el-form-item>
                        <el-form-item label="本次付款" prop="payAmount">
                            <el-input-number 
                                v-model="payForm.payAmount"
                                :min="0"
                                :max="payForm.amount - payForm.paidAmount"
                                :precision="2"
                                style="width: 100%;">
                            </el-input-number>
                        </el-form-item>
                        <el-form-item label="付款日期" prop="payDate">
                            <el-date-picker
                                v-model="payForm.payDate"
                                type="date"
                                placeholder="选择日期"
                                style="width: 100%;">
                            </el-date-picker>
                        </el-form-item>
                        <el-form-item label="付款方式" prop="payMethod">
                            <el-select v-model="payForm.payMethod" style="width: 100%;">
                                <el-option label="现金" value="cash"></el-option>
                                <el-option label="银行转账" value="bank"></el-option>
                                <el-option label="支票" value="check"></el-option>
                            </el-select>
                        </el-form-item>
                        <el-form-item label="备注" prop="remark">
                            <el-input 
                                type="textarea"
                                v-model="payForm.remark"
                                :rows="2">
                            </el-input>
                        </el-form-item>
                    </template>
                </el-form>
                <div slot="footer">
                    <el-button @click="payDialogVisible = false">取 消</el-button>
                    <el-button type="primary" @click="confirmPay">确 定</el-button>
                </div>
            </el-dialog>

            <!-- 付款记录对话框 -->
            <el-dialog 
                title="付款记录" 
                :visible.sync="historyDialogVisible"
                width="50%">
                <el-table :data="payHistory" stripe border>
                    <el-table-column prop="date" label="付款日期" width="120"></el-table-column>
                    <el-table-column label="付款金额" width="120">
                        <template slot-scope="scope">
                            ¥{{ (scope.row.amount || 0).toFixed(2) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="method" label="付款方式" width="120">
                        <template slot-scope="scope">
                            {{ getMethodText(scope.row.method) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="remark" label="备注"></el-table-column>
                </el-table>
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
                supplierId: '',
                status: ''
            },
            payDialogVisible: false,
            historyDialogVisible: false,
            showAddPayForm: false,
            payForm: {
                documentNo: '',
                supplierName: '',
                amount: 0,
                paidAmount: 0,
                payAmount: 0,
                payDate: new Date().toISOString().split('T')[0],
                payMethod: 'cash',
                remark: ''
            },
            payHistory: [],
            rules: {
                supplierId: [
                    { required: true, message: '请选择供应商', trigger: 'change' }
                ],
                amount: [
                    { required: true, message: '请输入应付金额', trigger: 'blur' },
                    { type: 'number', message: '金额必须为数字', trigger: 'blur' }
                ],
                dueDate: [
                    { required: true, message: '请选择到期日', trigger: 'change' }
                ],
                payAmount: [
                    { required: true, message: '请输入付款金额', trigger: 'blur' },
                    { type: 'number', message: '金额必须为数字', trigger: 'blur' }
                ],
                payDate: [
                    { required: true, message: '请选择付款日期', trigger: 'change' }
                ],
                payMethod: [
                    { required: true, message: '请选择付款方式', trigger: 'change' }
                ]
            }
        };
    },

    computed: {
        // 根据条件筛选应付记录
        filteredPayables() {
            if (!this.systemData.payables || !this.systemData.payables.records) {
                return [];
            }
            return this.systemData.payables.records.filter(record => {
                // 供应商筛选
                if (this.queryForm.supplierId && 
                    record.supplierId !== this.queryForm.supplierId) {
                    return false;
                }

                // 状态筛选
                if (this.queryForm.status) {
                    const status = this.getRecordStatus(record);
                    if (status !== this.queryForm.status) {
                        return false;
                    }
                }

                return true;
            });
        },

        // 应付总额
        totalAmount() {
            if (!this.filteredPayables.length) return 0;
            return this.filteredPayables.reduce((sum, r) => sum + r.amount, 0);
        },

        // 已付金额
        paidAmount() {
            if (!this.filteredPayables.length) return 0;
            return this.filteredPayables.reduce((sum, r) => sum + r.paidAmount, 0);
        },

        // 未付金额
        unpaidAmount() {
            return this.totalAmount - this.paidAmount;
        },

        // 逾期金额
        overdueAmount() {
            return this.filteredPayables
                .filter(r => this.isOverdue(r))
                .reduce((sum, r) => sum + this.getUnpaidAmount(r), 0);
        }
    },

    methods: {
        // 获取未付金额
        getUnpaidAmount(record) {
            return record.amount - record.paidAmount;
        },

        // 获取记录状态
        getRecordStatus(record) {
            if (record.amount <= record.paidAmount) {
                return 'completed';
            }
            if (record.paidAmount > 0) {
                return 'partial';
            }
            if (this.isOverdue(record)) {
                return 'overdue';
            }
            return 'pending';
        },

        // 获取状态类型
        getStatusType(record) {
            const status = this.getRecordStatus(record);
            switch (status) {
                case 'completed':
                    return 'success';
                case 'partial':
                    return 'warning';
                case 'overdue':
                    return 'danger';
                default:
                    return 'info';
            }
        },

        // 获取状态文本
        getStatusText(record) {
            const status = this.getRecordStatus(record);
            switch (status) {
                case 'completed':
                    return '已付款';
                case 'partial':
                    return '部分付款';
                case 'overdue':
                    return '已逾期';
                default:
                    return '未付款';
            }
        },

        // 获取付款方式文本
        getMethodText(method) {
            switch (method) {
                case 'cash':
                    return '现金';
                case 'bank':
                    return '银行转账';
                case 'check':
                    return '支票';
                default:
                    return method;
            }
        },

        // 检查是否已完成
        isCompleted(record) {
            return record.amount <= record.paidAmount;
        },

        // 检查是否逾期
        isOverdue(record) {
            if (this.isCompleted(record)) return false;
            const today = new Date();
            const dueDate = new Date(record.dueDate);
            return today > dueDate;
        },

        // 处理付款
        handlePay(record) {
            // 确保数据结构存在
            if (!this.systemData.payables) {
                this.systemData.payables = { records: [], total: 0 };
            }
            if (!this.systemData.payables.records) {
                this.systemData.payables.records = [];
            }

            if (!record) {
                this.payForm = {
                    documentNo: '',
                    supplierName: '',
                    amount: 0,
                    paidAmount: 0,
                    payAmount: 0,
                    payDate: new Date().toISOString().split('T')[0],
                    payMethod: 'cash',
                    remark: '',
                    supplierId: '',
                    documentType: 'manual',
                    dueDate: ''
                };
                this.showAddPayForm = true;
            } else {
                this.payForm = {
                    documentNo: record.documentNo,
                    supplierName: record.supplierName,
                    amount: record.amount,
                    paidAmount: record.paidAmount,
                    payAmount: this.getUnpaidAmount(record),
                    payDate: new Date().toISOString().split('T')[0],
                    payMethod: 'cash',
                    remark: ''
                };
                this.showAddPayForm = false;
            }
            this.payDialogVisible = true;
        },

        // 确认付款
        confirmPay() {
            this.$refs.payForm.validate((valid) => {
                if (valid) {
                    if (this.showAddPayForm) {
                        // 新增应付记录
                        const supplier = this.systemData.suppliers.find(
                            s => s.id === this.payForm.supplierId
                        );
                        
                        const newRecord = {
                            documentNo: `AP${Date.now()}`,
                            date: new Date().toISOString().split('T')[0],
                            supplierId: this.payForm.supplierId,
                            supplierName: supplier.name,
                            amount: this.payForm.amount,
                            paidAmount: 0,
                            dueDate: this.payForm.dueDate,
                            payRecords: []
                        };
                        
                        this.systemData.payables.records.push(newRecord);
                        this.$emit('data-change');
                        this.payDialogVisible = false;
                        this.$message.success('新增应付成功');
                        return;
                    }

                    // 更新应付记录
                    const record = this.systemData.payables.records.find(
                        r => r.documentNo === this.payForm.documentNo
                    );
                    
                    if (record) {
                        // 添加付款记录
                        if (!record.payRecords) {
                            record.payRecords = [];
                        }
                        
                        const payRecord = {
                            date: this.payForm.payDate,
                            amount: this.payForm.payAmount,
                            method: this.payForm.payMethod,
                            remark: this.payForm.remark
                        };
                        
                        record.payRecords.push(payRecord);
                        record.paidAmount += this.payForm.payAmount;

                        // 添加现金流水记录
                        if (!this.systemData.cashFlow) {
                            this.systemData.cashFlow = { balance: 0, records: [] };
                        }

                        this.systemData.cashFlow.records.push({
                            id: `CF${Date.now()}`,
                            date: this.payForm.payDate,
                            type: '支出',
                            amount: this.payForm.payAmount,
                            relatedType: '应付付款',
                            relatedId: record.documentNo,
                            remark: `支付供应商${record.supplierName}的款项`
                        });

                        this.systemData.cashFlow.balance -= this.payForm.payAmount;
                    }

                    this.$emit('data-change');
                    this.payDialogVisible = false;
                    this.$message.success('付款成功');
                }
            });
        },

        // 查看付款记录
        viewHistory(record) {
            this.payHistory = record.payRecords || [];
            this.historyDialogVisible = true;
        },

        // 导出应付明细
        exportPayables() {
            // 生成CSV内容
            let csvContent = '\uFEFF'; // 添加BOM以支持中文
            csvContent += `应付账款明细表\n`;
            csvContent += `导出时间：${new Date().toLocaleString()}\n\n`;
            csvContent += `单据日期,单据编号,供应商名称,单据金额,已付金额,未付金额,到期日,状态\n`;

            this.filteredPayables.forEach(record => {
                csvContent += `${record.date},${record.documentNo},${record.supplierName},` +
                    `${record.amount.toFixed(2)},${record.paidAmount.toFixed(2)},` +
                    `${this.getUnpaidAmount(record).toFixed(2)},${record.dueDate},` +
                    `${this.getStatusText(record)}\n`;
            });

            csvContent += `\n汇总信息\n`;
            csvContent += `应付总额,¥${this.totalAmount.toFixed(2)}\n`;
            csvContent += `已付金额,¥${this.paidAmount.toFixed(2)}\n`;
            csvContent += `未付金额,¥${this.unpaidAmount.toFixed(2)}\n`;
            csvContent += `逾期金额,¥${this.overdueAmount.toFixed(2)}\n`;

            // 创建并下载文件
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `应付账款明细_${new Date().toLocaleDateString()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    },

    created() {
        // 确保数据结构初始化
        if (!this.systemData.payables) {
            this.systemData.payables = { records: [], total: 0 };
        }
        if (!this.systemData.payables.records) {
            this.systemData.payables.records = [];
        }
    }
}); 