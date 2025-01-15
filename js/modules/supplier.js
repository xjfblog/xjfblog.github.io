// 供应商管理模块
Vue.component('supplier-component', {
    template: `
        <div class="supplier-management">
            <el-card>
                <div slot="header">
                    <el-row type="flex" justify="space-between" align="middle">
                        <el-col :span="8">
                            <el-button type="primary" @click="handleAdd">新增供应商</el-button>
                        </el-col>
                        <el-col :span="8">
                            <el-input
                                placeholder="请输入供应商名称搜索"
                                v-model="searchQuery"
                                clearable>
                                <i slot="prefix" class="el-icon-search"></i>
                            </el-input>
                        </el-col>
                    </el-row>
                </div>

                <!-- 供应商列表 -->
                <el-table :data="filteredSuppliers" stripe border>
                    <el-table-column prop="id" label="供应商编号" width="100"></el-table-column>
                    <el-table-column prop="name" label="供应商名称"></el-table-column>
                    <el-table-column label="应付账款" width="120">
                        <template slot-scope="scope">
                            <span :class="{'red-text': getPayableAmount(scope.row.id) > 0}">
                                ¥{{ getPayableAmount(scope.row.id).toFixed(2) }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="200" fixed="right">
                        <template slot-scope="scope">
                            <el-button size="mini" @click="handleEdit(scope.row)">编辑</el-button>
                            <el-button 
                                size="mini" 
                                type="danger" 
                                @click="handleDelete(scope.row)"
                                :disabled="isSupplierInUse(scope.row.id)">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>

            <!-- 供应商编辑对话框 -->
            <el-dialog 
                :title="dialogTitle" 
                :visible.sync="dialogVisible"
                width="50%"
                @close="resetForm">
                <el-form 
                    :model="supplierForm" 
                    :rules="rules" 
                    ref="supplierForm" 
                    label-width="100px">
                    <el-form-item label="供应商名称" prop="name">
                        <el-input v-model="supplierForm.name"></el-input>
                    </el-form-item>
                    <el-form-item label="备注" prop="remark">
                        <el-input type="textarea" v-model="supplierForm.remark"></el-input>
                    </el-form-item>
                </el-form>
                <div slot="footer">
                    <el-button @click="dialogVisible = false">取 消</el-button>
                    <el-button type="primary" @click="handleSave">确 定</el-button>
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
            searchQuery: '',
            dialogVisible: false,
            isNewSupplier: true,
            supplierForm: {
                id: null,
                name: '',
                remark: ''
            },
            rules: {
                name: [
                    { required: true, message: '请输入供应商名称', trigger: 'blur' }
                ]
            }
        }
    },

    computed: {
        dialogTitle() {
            return this.isNewSupplier ? '新增供应商' : '编辑供应商';
        },

        filteredSuppliers() {
            return this.systemData.suppliers.filter(supplier =>
                supplier.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }
    },

    methods: {
        getEmptySupplierForm() {
            return {
                id: null,
                name: '',
                remark: ''
            };
        },

        handleAdd() {
            this.isNewSupplier = true;
            this.supplierForm = this.getEmptySupplierForm();
            this.dialogVisible = true;
        },

        handleEdit(row) {
            this.isNewSupplier = false;
            this.supplierForm = { ...row };
            this.dialogVisible = true;
        },

        handleDelete(row) {
            if (this.isSupplierInUse(row.id)) {
                this.$message.warning('该供应商有未完成的交易，不能删除');
                return;
            }

            this.$confirm('确认删除该供应商吗？', '提示', {
                type: 'warning'
            }).then(() => {
                const index = this.systemData.suppliers.findIndex(item => item.id === row.id);
                this.systemData.suppliers.splice(index, 1);
                this.$emit('data-change');
                this.$message.success('删除成功');
            }).catch(() => {});
        },

        handleSave() {
            this.$refs.supplierForm.validate((valid) => {
                if (valid) {
                    if (this.isNewSupplier) {
                        // 新增供应商
                        const newId = Math.max(0, ...this.systemData.suppliers.map(p => p.id)) + 1;
                        this.supplierForm.id = newId;
                        this.systemData.suppliers.push({ ...this.supplierForm });
                    } else {
                        // 编辑供应商
                        const index = this.systemData.suppliers.findIndex(item => item.id === this.supplierForm.id);
                        this.systemData.suppliers.splice(index, 1, { ...this.supplierForm });
                    }
                    this.$emit('data-change');
                    this.dialogVisible = false;
                    this.$message.success('保存成功');
                }
            });
        },

        resetForm() {
            this.$refs.supplierForm?.resetFields();
        },

        // 获取供应商的应付账款金额
        getPayableAmount(supplierId) {
            return this.systemData.payables.records
                .filter(record => record.supplierId === supplierId)
                .reduce((total, record) => total + (record.amount - record.paidAmount), 0);
        },

        // 检查供应商是否有未完成的交易
        isSupplierInUse(supplierId) {
            // 检查是否有未完成的采购订单
            const hasUnfinishedPurchase = this.systemData.purchases.some(
                order => order.supplierId === supplierId && order.status !== '已完成'
            );

            // 检查是否有未结清的应付账款
            const hasUnpaidPayables = this.getPayableAmount(supplierId) > 0;

            return hasUnfinishedPurchase || hasUnpaidPayables;
        }
    }
}); 