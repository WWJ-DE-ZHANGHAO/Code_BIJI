package com.wwj.WebSocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 注册一个Stomp的端点，并指定使用SockJS协议，连接地址:ws://ip:port/ws
        registry.addEndpoint("/ws")
                        .setAllowedOriginPatterns("*") // 允许所有来源
                        .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 配置消息代理，指定消息发送的前缀.客户端订阅前缀。topic 用于广播，queue 用于点对点
        registry.enableSimpleBroker("/topic", "/queue");
        //服务端接收前缀
        registry.setApplicationDestinationPrefixes("/app");
    }

    }

