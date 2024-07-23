<template>
  <el-form
      ref="formRef"
      :model="task"
      label-width="120px"
  >
    <el-scrollbar>
      <el-container style="height: 100vh;">
        <el-header fixed style="margin-bottom: 30px;margin-top: 5px;">
          <el-form-item
              prop="task_title"
              label="任务标题"
              :rules="[
        {
          required: true,
          message: '请输入任务的标题',
          trigger: 'blur',
        }
      ]"
          >
            <el-input v-model="task.task_title" placeholder="请输入任务的标题"/>
          </el-form-item>

          <el-form-item
              label="截止时间"
              prop="deadline"
              :rules="{
          required: true,
          message: '请选择截止日期和时间',
          trigger: ['blur', 'change'],
        }"
          >
            <el-col :span="11">
              <el-date-picker
                  v-model="task.deadline"
                  type="datetime"
                  placeholder="选择截止日期和时间"
                  style="width: 100%"
              />
            </el-col>
          </el-form-item>
        </el-header>

        <el-main style="height: auto; margin-top: auto">
          <el-form-item
              v-for="(answer, index) in task.answers"
              :key="index"
              :label="'答案' + (index + 1)"
              :prop="'answers.' + index + '.qa_answer'"
              :rules="{
              required: true,
              message: '答案不能为空',
              trigger: 'blur',
            }"
          >
            <el-input v-model="answer.qa_answer" placeholder="请输入答案" disabled="disabled"/>
            <el-popconfirm title="删除这一题？" @confirm="removeAnswerItem(answer)">
              <template #reference>
                <el-button class="mt-2">删除</el-button>
              </template>
            </el-popconfirm>
          </el-form-item>
        </el-main>

        <el-footer class="footer-btns" fixed>
          <el-button type="primary" @click="submitForm(formRef)">发布！</el-button>
          <el-button type="success" @click="addAnswerItem('A')">创建A</el-button>
          <el-button type="warning" @click="addAnswerItem('B')">创建B</el-button>
          <el-button type="danger" @click="addAnswerItem('C')">创建C</el-button>
          <el-button type="info" @click="addAnswerItem('D')">创建D</el-button>
        </el-footer>
      </el-container>
    </el-scrollbar>
  </el-form>
  <el-dialog
      v-model="centerDialogVisible"
      title="任务发布成功，请保存好以下内容(不再弹出)，将该链接发送给学生和教师。"
      width="60%"
      align-center
      center
      fullscreen
  >
    <div>
      <span style="text-align: center; display: block;">学生作答链接：{{ studentUrl }}<el-button
          style="margin-left: 10px" @click="copyToClipboard(studentUrl)">点我复制</el-button></span>
    </div>
    <div style="margin-top: 10px">
      <span style="text-align: center; display: block;">教师查看链接：{{ teacherUrl }}<el-button
          style="margin-left: 10px" @click="copyToClipboard(teacherUrl)">点我复制</el-button></span>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="centerDialogVisible = false;">
          收到
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>

import {reactive, ref} from 'vue'
import type {FormInstance} from 'element-plus'
import axios from 'axios'
import {api_url, page_url} from "@/main";


const formRef = ref<FormInstance>()
const centerDialogVisible = ref(false)
const studentUrl = ref('')
const teacherUrl = ref('')
const qa_number = ref(1)


async function copyToClipboard(text: string) {
  try {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.setAttribute("value", text);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    ElMessage.success('已成功复制到剪贴板');
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    ElMessage.error('复制到剪贴板失败');
  }
}

interface Task {
  answers: AnswerItem[]
  task_title: string
  task_description: string
  deadline: string
}

const task = reactive<Task>({
  task_title: '',
  task_description: '暂无描述',
  deadline: '',
  answers: [
    {
      qa_title: '这是答题卡，填写答案即可。',
      qa_answer: 'A',
      qa_number: qa_number.value++
    },
  ],
})


interface AnswerItem {
  qa_title: string
  qa_number: number
  qa_answer: string
}


const removeAnswerItem = (item: AnswerItem) => {


  const index = task.answers.indexOf(item)
  if (index !== -1) {
    task.answers.splice(index, 1)
  }
}

const addAnswerItem = (answerContent: string) => {
  task.answers.push({
    qa_title: "这是答题卡，填写答案即可。",
    qa_answer: answerContent,
    qa_number: qa_number.value++
  })
}

const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;

  try {
    const valid = await formEl.validate();
    if (valid) {
      console.log('验证成功! 开始提交任务...');

      // 发送 POST 请求
      const response = await axios.post(api_url + '/tasks/new_task', task);

      if (response.status === 200 || response.status === 201) {
        console.log('提交成功!');

        console.log('新建任务的 ID:', response.data.data.task_id);
        // 学生作答链接为
        studentUrl.value = `${page_url}/tasks/check_in?task_id=${response.data.data.task_id}`

        // 老师查看任务报告的链接为
        teacherUrl.value = `${page_url}/tasks/status?task_id=${response.data.data.task_id}`
        centerDialogVisible.value = true


      } else {
        console.error('服务器返回错误状态码:', response.status);
        ElMessage.error(response.data.msg);
      }
    } else {
      console.log('提交失败！请检查表单');
      ElMessage.error('请检查表单');
    }
  } catch (error) {
    console.error('请求过程中发生错误:', error);
    console.log('请联系管理员');
    ElMessage.error('请求过程中发生错误，请联系管理员');
  }
};


</script>

<style scoped>

.footer-btns {
  width: 100%;
  background-color: #f5f7fa;
  border-top: 1px solid #ebeef5;
  padding: 10px 20px;
  box-sizing: border-box;
  height: auto;
}


</style>
