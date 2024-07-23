<script lang="ts" setup>
import {ref, computed, watch, onMounted} from "vue";
import {useRoute} from "vue-router";
import {api_url, page_url} from "@/main";
import axios from 'axios'

const taskData = ref(null as any[] | null);

// 获取路由参数
const route = useRoute()

const studentId = computed(() => route.query.student_id)
if (studentId.value == '') {
  ElMessage.error('student_id有误')
}

const taskId = computed(() => route.query.task_id)
if (taskId.value == '') {
  ElMessage.error('task_id有误')
}
console.log(taskId.value, studentId.value)


interface Answer {
  qa_id: string;
  q_answer: string;
  qa_number: number;
  spend_time: string;
}

function initializeAnswers() {
  if (Array.isArray(taskData.value)) {
    answers.value = taskData.value.map((question: any) => ({
      qa_id: question.qa_id,
      qa_number: question.qa_number,
      q_answer: "",
      spend_time: ""
    }));
  }
}

watch(taskData, () => {
  if (Array.isArray(taskData.value)) {
    initializeAnswers();
  }
}, {immediate: true});

// 根据 taskData 初始化 answers 数组
const answers = ref<Answer[]>([]);

const currentQuestionIndex = ref(0);
const selectedAnswer = ref<string | null>(null);

// 将 questionsCount 和 currentQuestion 改为计算属性
const questionsCount = computed(() => taskData.value ? taskData.value.length : 0);
const currentQuestion = computed(() => taskData.value && taskData.value[currentQuestionIndex.value]);

const percentage = computed(() => {
  // 四舍五入取整
  return Math.round(((currentQuestionIndex.value + 1) / questionsCount.value) * 100);
});

// 封装的请求函数
async function fetchTaskData() {
  try {
    const response = await axios.get(`${api_url}/tasks/get_task_data`, {
      params: {
        student_id: studentId.value,
        task_id: taskId.value,
      },
    });

    if (response.data.code === 200) {
      taskData.value = response.data.data;

      initializeAnswers();
    } else {
      ElMessage.error(
          {
            message: response.data.msg,
            duration: 0
          }
      );
    }
  } catch (error) {
    ElMessage.error(
        {
          message: error.response.data.msg || '获取任务数据时发生未知错误',
          duration: 0
        }
    );
  }
}

onMounted(async () => {
  await fetchTaskData();
});

let initSelectedAnswer = () => {
  if (currentQuestion.value?.qa_id && currentQuestionIndex.value >= 0) {
    // 确保answers数组在相应索引位置已有对象存在，若不存在则初始化
    if (!answers.value[currentQuestionIndex.value]) {
      answers.value[currentQuestionIndex.value] = {qa_id: currentQuestion.value.qa_id, q_answer: "", spend_time: ""};
    }
    selectedAnswer.value = answers.value[currentQuestionIndex.value]?.q_answer || null;
  } else {
    selectedAnswer.value = null;
  }
};

// 在 currentQuestionIndex 改变时触发初始化
watch(currentQuestionIndex, () => {
  initSelectedAnswer();
}, {immediate: true});

// 更新当前题目的选择答案
const selectAnswer = (choice: string) => {
  // 更新选中的答案到 selectedAnswer ref
  selectedAnswer.value = choice;

  if (
      currentQuestion.value?.qa_id &&
      currentQuestionIndex.value >= 0 &&
      currentQuestionIndex.value < answers.value.length
  ) {
    // 确保当前问题的答案是最新选择的
    const existingAnswer = answers.value[currentQuestionIndex.value];

    if (existingAnswer) {
      existingAnswer.q_answer = choice;
    } else {
      console.error('尝试访问的答案数组索引对应的记录不存在');
    }
  } else {
    console.error('尝试访问的答案数组索引超出范围或未初始化');
  }
};


const unfinishedQuestions = computed(() => {
  return taskData.value.filter((question, index) => answers.value[index]?.q_answer === "").length;
});
// 未作答提示框
const centerDialogVisible = ref(false);

const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
  }
};

const nextQuestion = () => {
  if (currentQuestionIndex.value < questionsCount.value - 1) {
    currentQuestionIndex.value++;
  }
};

const submitAnswers = (isDig = false) => {
  // 如果对话框已打开或没有未完成题目，则直接提交答案
  if (isDig || unfinishedQuestions.value === 0) {
    const data = {
      "student_id": studentId.value,
      "task_id": taskId.value,
      "task_data": answers.value

    }
    console.log('提交答案：', data);
    axios.post(`${api_url}/tasks/push_answer`, data)
        .then((response) => {
          if (response.data.code === 200) {
            ElMessage.success('提交成功');
            // 提交成功后跳转到get_report
            ElNotification.success(
                {
                  message: "3秒后跳转到报告页",
                  showClose: false
                });
            setTimeout(() => {
              window.location.href = `${page_url}/tasks/get_report?student_id=` + studentId.value + '&task_id=' + taskId.value;
            }, 3000);
          } else {
            ElMessage.error(response.data.msg);
          }
        }).catch((error) => {
      // 处理 Axios 抛出的错误
      console.error('提交答案时发生错误:', error);
      if (error.response && error.response.data) {
        ElMessage.error(error.response.data.msg || '服务器内部错误');
        if (error.response.data.msg == "禁止重复提交") {
          ElNotification.success(
              {
                message: "3秒后跳转到报告页",
                showClose: false
              });
          setTimeout(() => {
            window.location.href = `${page_url}/tasks/get_report?student_id=` + studentId.value + '&task_id=' + taskId.value;
          }, 3000);
        }
      } else {
        ElMessage.error('无法连接到服务器，请稍后再试');
      }
    });

    return;
  }
  // 对话框关闭状态下且有未完成题目时显示提示对话框
  centerDialogVisible.value = true;
};

const customColorMethod = (percentage: number) => {
  if (percentage < 30) {
    return '#909399'
  }
  if (percentage < 60) {
    return '#e6a23c'
  }
  if (percentage < 80) {
    return '#67c23a'
  }
  if (percentage < 90) {
    return '#409eff'
  }
  return '#1989fa'
}
</script>

<template>
  <div class="main-page">
    <el-container style="height: 100vh;">
      <!-- Header -->
      <el-header fixed>
        <el-tag
            type="info"
            effect="light"
            round
        >
          答题卡 {{ '题号：' + (currentQuestionIndex + 1) }}
        </el-tag>
        <el-progress :percentage="percentage" :color="customColorMethod" :text-inside="false"
                     style="margin-top: 6px"></el-progress>
        <div class="subject-type" style="text-align: left;">
          <div style="width:41px; position: absolute; bottom: 5px; left: 0;">
            <!--            图片资源来自zyzx-->
            <img
                alt=""
                src="data:image/png;base64,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"
                mode="widthFix" class="img">
          </div>
          <span> {{ 1 }} 单选题</span>
        </div>
      </el-header>


      <el-scrollbar>
        <el-main class="scrollable-content">
          <div v-if="currentQuestion" class="topic">
            <span style="font-family: 宋体,serif;">{{ currentQuestion.q_title }}</span>
            <div class="answers">
              <el-button
                  class="answer-choice"
                  v-for="(choice, key) in currentQuestion.q_choice"
                  :key="key"
                  size="large"
                  :class="{ 'answer-button': true, 'not-chosed': selectedAnswer !== key }"
                  type="primary"
                  text
                  bg
                  round
                  @click="selectAnswer(key)"
              >
                <span style="margin-right: 0.5em;">{{ key }}</span>{{ choice }}
              </el-button>

            </div>
          </div>
        </el-main>


      </el-scrollbar>

      <el-footer fixed>
        <el-button
            size="large"
            :disabled="currentQuestionIndex === 0"
            class="footer-button"
            round
            @click="prevQuestion()"
        >
          {{ currentQuestionIndex === 0 ? '已到第一题' : '上一题' }}
        </el-button>
        <el-button
            type="primary"
            size="large"
            :class="{ 'footer-button': true, 'submit-button': currentQuestionIndex === questionsCount - 1 ,  'yellow-button': currentQuestionIndex === questionsCount - 1}"
            round
            @click="currentQuestionIndex === questionsCount - 1 ? submitAnswers() : nextQuestion()"
        >
          {{ currentQuestionIndex === questionsCount - 1 ? '提交' : '下一题' }}
        </el-button>

      </el-footer>

      <el-dialog
          v-model="centerDialogVisible"
          title="提示"
          width="500"
          align-center
          center
      >
        <span style="text-align: center; display: block;">还有{{ unfinishedQuestions }}题未完成，是否继续提交？</span>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="centerDialogVisible = false">算了</el-button>
            <el-button type="primary" @click="centerDialogVisible = false; submitAnswers(true)">
              提交
            </el-button>
          </div>
        </template>
      </el-dialog>
    </el-container>

  </div>
</template>

<style scoped>
.answers {
  margin-top: 20px;

}

.not-chosed {
  --el-button-text-color: block;
  border-color: #f3f7f9 !important;
}

.answer-button {
  margin-bottom: 18px;
  --el-button-size: 80px;
  width: 100%;
  margin-left: 0;
  font-size: 18px;
  --el-button-border-color: #ffe251 !important;
  --el-button-hover-border-color: #ffe251 !important;
  --el-button-active-border-color: #9b6600 !important;
  border: 2px solid #457fe0;
}


.main-page {
  display: flex;
  min-height: 100vh;
  position: absolute;
  width: 100%;
  user-select: none
}

.scrollable-content {
  overflow-y: auto;
}


.subject-type {
  padding-bottom: 14px;
  font-size: 16px;
  position: relative;
  font-weight: 500;
}

.topic {
  position: relative;
  margin-top: -20px;

}

.el-header {
  height: auto;
  text-align: center;
}

.el-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
  padding: 0 11px;
}


.el-main {
  margin-top: -5px;

}

.el-container {
  min-height: 100vh;
}

.el-tag {
  padding: 0 32px 0 32px;
  --el-tag-font-size: 14px;
  --el-tag-text-color: #333;
  margin-top: 12px;
}

.footer-button {
  flex: 1;
  font-size: large;
  margin-top: 20px;
  position: relative;
  max-width: 530px;
}

.yellow-button {
  background-color: #ffe251 !important;
  color: #9b6600 !important;
  --el-button-border-color: #ffe251 !important;
  --el-button-hover-border-color: #ffe251 !important;
  --el-button-active-border-color: #9b6600 !important;
}

.footer-button + .footer-button {
  margin-left: 20px;
}
</style>