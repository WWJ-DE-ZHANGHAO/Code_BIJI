package com.wwj.Controller.Chat;

import com.wwj.Pojo.ChatMessage;
import com.wwj.Pojo.ChatSession;
import com.wwj.Service.IChatMessageService;
import com.wwj.Service.IChatSessionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@RestController
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private IChatMessageService chatMessageService;

    @Autowired
    private IChatSessionService chatSessionService;

    // ====================== 【核心：修复强转 + 修复报错】 ======================
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage message, SimpMessageHeaderAccessor headerAccessor) {

        // ========== 安全获取 senderId（绝对不报错） ==========
        Object senderIdObj = headerAccessor.getSessionAttributes().get("senderId");
        Object roleObj = headerAccessor.getSessionAttributes().get("role");

        if (senderIdObj == null || roleObj == null) {
            log.error("用户未登录，无法发送消息");
            return;
        }

        // 兼容 Integer / Long
        Long senderId;
        if (senderIdObj instanceof Integer) {
            senderId = ((Integer) senderIdObj).longValue();
        } else {
            senderId = (Long) senderIdObj;
        }
        String senderRole = (String) roleObj;

        // 填充消息
        message.setSenderId(senderId);
        message.setSenderType(senderRole);
        message.setCreateTime(LocalDateTime.now());
        message.setIsRead(0);

        // 保存消息
        chatMessageService.save(message);

        // 更新会话
        chatSessionService.updateSession(message, senderRole);

        Long receiverId = message.getReceiverId();
        log.info("消息路由: {} -> {} 内容:{}", senderId, receiverId, message.getContent());

        // 用户发 → 客服广播
        if ("USER".equals(senderRole)) {
            messagingTemplate.convertAndSend("/topic/admin.messages", message);
        }

        // 客服发 → 用户点对点
        else if ("ADMIN".equals(senderRole)) {
            log.info("客服发送消息给用户: {}", receiverId);
            // 发送到用户订阅的路径
            messagingTemplate.convertAndSendToUser(
                    receiverId.toString(),
                    "/queue/messages",
                    message
            );
        }
    }

    // ====================== 以下接口完全不动 ======================

    // 获取历史消息
    @GetMapping("/api/chat/history")
    public List<ChatMessage> getHistory(@RequestParam Long userId, @RequestParam Long adminId) {
        return chatMessageService.getHistory(userId, adminId);
    }

    // 获取会话列表
    @GetMapping("/api/chat/sessions")
    public List<ChatSession> getSessions() {
        List<ChatSession> list = chatSessionService.lambdaQuery()
                .eq(ChatSession::getAdminId, 2L)
                .list();
        return list;
    }

    // 标记已读
    @PutMapping("/api/chat/read")
    public void markRead(@RequestBody ChatMessage message) {
        chatMessageService.markRead(message.getSenderId(), message.getReceiverId());
    }
}