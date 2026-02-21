# 把项目上传到 GitHub 并建立版本历史

## 1. 在项目根目录初始化 Git（若尚未初始化）

```bash
cd d:\文档\BaiduSyncdisk\notion-carousel
git init
git branch -M main
```

## 2. 第一次提交，建立历史

```bash
git add .
git status
# 确认没有 .env、node_modules 被加入（.gitignore 会排除它们）
git commit -m "Initial commit: Notion carousel app"
```

## 3. 在 GitHub 上建仓库

- 打开 https://github.com/new
- Repository name 填 `notion-carousel`（或你喜欢的名字）
- 选 **Private** 或 **Public**
- **不要**勾选 "Add a README"（本地已有代码）
- 创建后记下仓库地址，例如：`https://github.com/你的用户名/notion-carousel.git`

## 4. 关联远程并推送

```bash
git remote add origin https://github.com/你的用户名/notion-carousel.git
git push -u origin main
```

## 5. 日常使用：建立历史版本、便于回滚

- **做完一个功能或修完一个 bug 就提交一次：**
  ```bash
  git add .
  git commit -m "简短描述，例如：增加背景色 RGB 设置"
  git push
  ```

- **给重要版本打标签（方便回滚）：**
  ```bash
  git tag -a v1.0 -m "第一个可用版本"
  git push origin v1.0
  ```

- **需要回滚到某个版本时：**
  - 查看历史：`git log --oneline`
  - 回滚到某次提交（只改工作区，不删历史）：  
    `git checkout <commit的哈希>`  
    或回滚到某个 tag：  
    `git checkout v1.0`
  - 若想以该版本为新的主线：  
    `git checkout -b recovery-main`  
    再 `git push -u origin recovery-main`

## 6. 建议

- 不要提交 `.env`、`server/.env`、`client/.env`（已写在 .gitignore，避免把 Notion 的 client secret 推到 GitHub）。
- 推送前养成 `git status` 看一眼，避免误提交敏感或无关文件。
