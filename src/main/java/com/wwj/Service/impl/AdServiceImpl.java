package com.wwj.Service.impl;

import com.wwj.Pojo.Ad;
import com.wwj.Mapper.AdMapper;
import com.wwj.Service.IAdService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 广告位表 服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-29
 */
@Service
public class AdServiceImpl extends ServiceImpl<AdMapper, Ad> implements IAdService {

}
