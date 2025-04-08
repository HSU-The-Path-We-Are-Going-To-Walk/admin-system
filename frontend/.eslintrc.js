module.exports = {
    extends: ["react-app"],
    rules: {
        // import 순서 관련 규칙 수정
        "import/first": "error",

        // 불필요한 경고 끄기
        "no-unused-vars": "warn",
        "react-hooks/exhaustive-deps": "warn",
        "import/no-anonymous-default-export": "warn"
    }
};
